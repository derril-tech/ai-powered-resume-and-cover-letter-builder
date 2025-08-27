import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplicationEntity } from '../entities/job_application.entity';

@Injectable()
export class JobApplicationsService {
    constructor(
        @InjectRepository(JobApplicationEntity)
        private readonly repo: Repository<JobApplicationEntity>,
    ) { }

    async create(data: Partial<JobApplicationEntity>) {
        const application = this.repo.create(data);
        return this.repo.save(application);
    }

    async list(orgId: string, userId: string, filters?: {
        status?: string;
        priority?: string;
        companyName?: string;
        isRemote?: boolean;
    }) {
        const query = this.repo.createQueryBuilder('application')
            .where('application.orgId = :orgId', { orgId })
            .andWhere('application.userId = :userId', { userId });

        if (filters?.status) {
            query.andWhere('application.status = :status', { status: filters.status });
        }

        if (filters?.priority) {
            query.andWhere('application.priority = :priority', { priority: filters.priority });
        }

        if (filters?.companyName) {
            query.andWhere('application.companyName ILIKE :companyName', {
                companyName: `%${filters.companyName}%`
            });
        }

        if (filters?.isRemote !== undefined) {
            query.andWhere('application.isRemote = :isRemote', { isRemote: filters.isRemote });
        }

        return query.orderBy('application.updatedAt', 'DESC').getMany();
    }

    async get(id: string) {
        return this.repo.findOne({ where: { id } });
    }

    async update(id: string, data: Partial<JobApplicationEntity>) {
        await this.repo.update(id, data);
        return this.get(id);
    }

    async delete(id: string) {
        return this.repo.delete(id);
    }

    async updateStatus(id: string, status: string) {
        const validStatuses = ['saved', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn'];
        if (!validStatuses.includes(status)) {
            throw new BadRequestException('Invalid status');
        }

        const updateData: Partial<JobApplicationEntity> = { status: status as any };

        if (status === 'applied' && !data.appliedAt) {
            updateData.appliedAt = new Date();
        }

        await this.repo.update(id, updateData);
        return this.get(id);
    }

    async addContact(id: string, contact: {
        name: string;
        email: string;
        phone?: string;
        role?: string;
        notes?: string;
    }) {
        const application = await this.get(id);
        if (!application) {
            throw new BadRequestException('Application not found');
        }

        const contacts = application.contacts || [];
        contacts.push(contact);

        await this.repo.update(id, { contacts });
        return this.get(id);
    }

    async updateContact(id: string, contactIndex: number, contact: {
        name: string;
        email: string;
        phone?: string;
        role?: string;
        notes?: string;
    }) {
        const application = await this.get(id);
        if (!application) {
            throw new BadRequestException('Application not found');
        }

        const contacts = application.contacts || [];
        if (contactIndex >= contacts.length) {
            throw new BadRequestException('Contact not found');
        }

        contacts[contactIndex] = contact;
        await this.repo.update(id, { contacts });
        return this.get(id);
    }

    async removeContact(id: string, contactIndex: number) {
        const application = await this.get(id);
        if (!application) {
            throw new BadRequestException('Application not found');
        }

        const contacts = application.contacts || [];
        if (contactIndex >= contacts.length) {
            throw new BadRequestException('Contact not found');
        }

        contacts.splice(contactIndex, 1);
        await this.repo.update(id, { contacts });
        return this.get(id);
    }

    async addFollowUp(id: string, followUp: {
        type: 'email' | 'call' | 'linkedin' | 'other';
        date: Date;
        description: string;
    }) {
        const application = await this.get(id);
        if (!application) {
            throw new BadRequestException('Application not found');
        }

        const followUps = application.followUps || [];
        followUps.push({
            id: Math.random().toString(36).substr(2, 9),
            ...followUp,
            completed: false
        });

        await this.repo.update(id, { followUps });
        return this.get(id);
    }

    async updateFollowUp(id: string, followUpId: string, updates: {
        type?: 'email' | 'call' | 'linkedin' | 'other';
        date?: Date;
        description?: string;
        completed?: boolean;
    }) {
        const application = await this.get(id);
        if (!application) {
            throw new BadRequestException('Application not found');
        }

        const followUps = application.followUps || [];
        const followUpIndex = followUps.findIndex(f => f.id === followUpId);

        if (followUpIndex === -1) {
            throw new BadRequestException('Follow-up not found');
        }

        followUps[followUpIndex] = { ...followUps[followUpIndex], ...updates };
        await this.repo.update(id, { followUps });
        return this.get(id);
    }

    async removeFollowUp(id: string, followUpId: string) {
        const application = await this.get(id);
        if (!application) {
            throw new BadRequestException('Application not found');
        }

        const followUps = application.followUps || [];
        const followUpIndex = followUps.findIndex(f => f.id === followUpId);

        if (followUpIndex === -1) {
            throw new BadRequestException('Follow-up not found');
        }

        followUps.splice(followUpIndex, 1);
        await this.repo.update(id, { followUps });
        return this.get(id);
    }

    async getStats(orgId: string, userId: string) {
        const stats = await this.repo
            .createQueryBuilder('application')
            .select([
                'application.status',
                'COUNT(*) as count'
            ])
            .where('application.orgId = :orgId', { orgId })
            .andWhere('application.userId = :userId', { userId })
            .groupBy('application.status')
            .getRawMany();

        const totalApplications = await this.repo.count({
            where: { orgId, userId }
        });

        const recentApplications = await this.repo.count({
            where: {
                orgId,
                userId,
                appliedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
        });

        const statusCounts = stats.reduce((acc, stat) => {
            acc[stat.application_status] = parseInt(stat.count);
            return acc;
        }, {} as Record<string, number>);

        return {
            total: totalApplications,
            recent: recentApplications,
            byStatus: statusCounts
        };
    }

    async getUpcomingFollowUps(orgId: string, userId: string, days: number = 7) {
        const applications = await this.list(orgId, userId);
        const upcomingFollowUps = [];

        for (const application of applications) {
            if (application.followUps) {
                for (const followUp of application.followUps) {
                    if (!followUp.completed) {
                        const followUpDate = new Date(followUp.date);
                        const now = new Date();
                        const diffTime = followUpDate.getTime() - now.getTime();
                        const diffDays = diffTime / (1000 * 60 * 60 * 24);

                        if (diffDays >= 0 && diffDays <= days) {
                            upcomingFollowUps.push({
                                applicationId: application.id,
                                companyName: application.companyName,
                                position: application.position,
                                followUp
                            });
                        }
                    }
                }
            }
        }

        return upcomingFollowUps.sort((a, b) =>
            new Date(a.followUp.date).getTime() - new Date(b.followUp.date).getTime()
        );
    }

    async search(orgId: string, userId: string, query: string) {
        return this.repo
            .createQueryBuilder('application')
            .where('application.orgId = :orgId', { orgId })
            .andWhere('application.userId = :userId', { userId })
            .andWhere(
                '(application.companyName ILIKE :query OR application.position ILIKE :query OR application.notes ILIKE :query)',
                { query: `%${query}%` }
            )
            .orderBy('application.updatedAt', 'DESC')
            .getMany();
    }
}
