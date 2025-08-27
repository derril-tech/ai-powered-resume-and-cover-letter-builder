import {
    Injectable,
    NotFoundException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Jobs } from '../entities/jobs.entity';
import { Projects } from '../entities/projects.entity';
import { Organizations } from '../entities/organizations.entity';
import { Users } from '../entities/users.entity';
import { Memberships } from '../entities/memberships.entity';

export type JobStatus = 'draft' | 'published' | 'archived';

export interface CreateJobDto {
    title: string;
    company: string;
    description: string;
    requirements?: string;
    benefits?: string;
    location?: string;
    salaryRange?: string;
    jobType?: string;
    status?: JobStatus;
}

export interface UpdateJobDto {
    title?: string;
    company?: string;
    description?: string;
    requirements?: string;
    benefits?: string;
    location?: string;
    salaryRange?: string;
    jobType?: string;
    status?: JobStatus;
}

@Injectable()
export class JobsService {
    private readonly logger = new Logger(JobsService.name);

    constructor(
        @InjectRepository(Jobs)
        private readonly jobsRepository: Repository<Jobs>,
        @InjectRepository(Projects)
        private readonly projectsRepository: Repository<Projects>,
        @InjectRepository(Organizations)
        private readonly organizationsRepository: Repository<Organizations>,
        @InjectRepository(Users)
        private readonly usersRepository: Repository<Users>,
        @InjectRepository(Memberships)
        private readonly membershipsRepository: Repository<Memberships>,
    ) { }

    /**
     * Create a new job
     */
    async create(
        createJobDto: CreateJobDto,
        projectId: string,
        userId: string,
    ): Promise<Jobs> {
        // Verify project exists and user has access
        const project = await this.projectsRepository.findOne({
            where: { id: projectId },
            relations: ['organization'],
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        // Check if user is a member of the organization
        const membership = await this.membershipsRepository.findOne({
            where: { userId, organizationId: project.organizationId },
        });

        if (!membership) {
            throw new ConflictException(
                `User ${userId} is not a member of organization ${project.organizationId}`,
            );
        }

        // Create job
        const job = this.jobsRepository.create({
            ...createJobDto,
            projectId,
            createdBy: userId,
        });

        const savedJob = await this.jobsRepository.save(job);

        this.logger.log(
            `Created job ${savedJob.title} (${savedJob.id}) in project ${projectId} by user ${userId}`,
        );

        return savedJob;
    }

    /**
     * Get job by ID
     */
    async findOne(id: string): Promise<Jobs> {
        const job = await this.jobsRepository.findOne({
            where: { id },
            relations: ['project', 'project.organization'],
        });

        if (!job) {
            throw new NotFoundException(`Job with ID ${id} not found`);
        }

        return job;
    }

    /**
     * Get all jobs for a project
     */
    async findByProject(projectId: string): Promise<Jobs[]> {
        return this.jobsRepository.find({
            where: { projectId },
            relations: ['project'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Get jobs by organization
     */
    async findByOrganization(organizationId: string): Promise<Jobs[]> {
        return this.jobsRepository.find({
            where: {
                project: { organizationId },
            },
            relations: ['project'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Get jobs by status
     */
    async findByStatus(status: JobStatus, organizationId?: string): Promise<Jobs[]> {
        const where: any = { status };

        if (organizationId) {
            where.project = { organizationId };
        }

        return this.jobsRepository.find({
            where,
            relations: ['project'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Update job
     */
    async update(
        id: string,
        updateJobDto: UpdateJobDto,
        userId: string,
    ): Promise<Jobs> {
        const job = await this.findOne(id);

        // Check if user has permission to update
        const project = await this.projectsRepository.findOne({
            where: { id: job.projectId },
            relations: ['organization'],
        });

        const membership = await this.membershipsRepository.findOne({
            where: { userId, organizationId: project!.organizationId },
        });

        const hasPermission = job.createdBy === userId ||
            (membership && ['owner', 'admin', 'editor'].includes(membership.role));

        if (!hasPermission) {
            throw new ConflictException('Insufficient permissions to update job');
        }

        // Update job
        Object.assign(job, updateJobDto);
        const updatedJob = await this.jobsRepository.save(job);

        this.logger.log(`Updated job ${id} by user ${userId}`);

        return updatedJob;
    }

    /**
     * Delete job
     */
    async remove(id: string, userId: string): Promise<void> {
        const job = await this.findOne(id);

        // Check if user has permission to delete
        const project = await this.projectsRepository.findOne({
            where: { id: job.projectId },
            relations: ['organization'],
        });

        const membership = await this.membershipsRepository.findOne({
            where: { userId, organizationId: project!.organizationId },
        });

        const hasPermission = job.createdBy === userId ||
            (membership && ['owner', 'admin'].includes(membership.role));

        if (!hasPermission) {
            throw new ConflictException('Insufficient permissions to delete job');
        }

        // Delete job
        await this.jobsRepository.remove(job);

        this.logger.log(`Deleted job ${id} by user ${userId}`);
    }

    /**
     * Search jobs
     */
    async searchJobs(
        organizationId: string,
        query: string,
        filters?: {
            status?: JobStatus;
            projectId?: string;
            company?: string;
            location?: string;
        },
    ): Promise<Jobs[]> {
        const qb = this.jobsRepository.createQueryBuilder('job')
            .leftJoinAndSelect('job.project', 'project')
            .where('project.organizationId = :organizationId', { organizationId });

        if (query) {
            qb.andWhere(
                '(job.title ILIKE :query OR job.company ILIKE :query OR job.description ILIKE :query)',
                { query: `%${query}%` },
            );
        }

        if (filters?.status) {
            qb.andWhere('job.status = :status', { status: filters.status });
        }

        if (filters?.projectId) {
            qb.andWhere('job.projectId = :projectId', { projectId: filters.projectId });
        }

        if (filters?.company) {
            qb.andWhere('job.company ILIKE :company', { company: `%${filters.company}%` });
        }

        if (filters?.location) {
            qb.andWhere('job.location ILIKE :location', { location: `%${filters.location}%` });
        }

        return qb.orderBy('job.createdAt', 'DESC').getMany();
    }

    /**
     * Get job statistics
     */
    async getJobStats(organizationId?: string): Promise<any> {
        const qb = this.jobsRepository.createQueryBuilder('job')
            .leftJoin('job.project', 'project');

        if (organizationId) {
            qb.where('project.organizationId = :organizationId', { organizationId });
        }

        const totalJobs = await qb.getCount();

        const jobsByStatus = await qb
            .select('job.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('job.status')
            .getRawMany();

        const jobsByCompany = await qb
            .select('job.company', 'company')
            .addSelect('COUNT(*)', 'count')
            .groupBy('job.company')
            .orderBy('count', 'DESC')
            .limit(10)
            .getRawMany();

        return {
            totalJobs,
            jobsByStatus: jobsByStatus.reduce((acc, stat) => {
                acc[stat.status] = parseInt(stat.count);
                return acc;
            }, {}),
            topCompanies: jobsByCompany.map(stat => ({
                company: stat.company,
                count: parseInt(stat.count),
            })),
        };
    }

    /**
     * Duplicate job
     */
    async duplicateJob(id: string, userId: string, overrides?: Partial<CreateJobDto>): Promise<Jobs> {
        const originalJob = await this.findOne(id);

        // Check if user has permission to read the original job
        const project = await this.projectsRepository.findOne({
            where: { id: originalJob.projectId },
            relations: ['organization'],
        });

        const membership = await this.membershipsRepository.findOne({
            where: { userId, organizationId: project!.organizationId },
        });

        if (!membership) {
            throw new ConflictException('Insufficient permissions to duplicate job');
        }

        // Create duplicated job
        const duplicatedJob = this.jobsRepository.create({
            title: overrides?.title || `${originalJob.title} (Copy)`,
            company: overrides?.company || originalJob.company,
            description: overrides?.description || originalJob.description,
            requirements: overrides?.requirements || originalJob.requirements,
            benefits: overrides?.benefits || originalJob.benefits,
            location: overrides?.location || originalJob.location,
            salaryRange: overrides?.salaryRange || originalJob.salaryRange,
            jobType: overrides?.jobType || originalJob.jobType,
            status: overrides?.status || 'draft',
            projectId: originalJob.projectId,
            createdBy: userId,
        });

        const savedJob = await this.jobsRepository.save(duplicatedJob);

        this.logger.log(`Duplicated job ${id} to ${savedJob.id} by user ${userId}`);

        return savedJob;
    }

    /**
     * Parse job description and extract key information
     */
    async parseJobDescription(id: string): Promise<any> {
        const job = await this.findOne(id);

        // This would integrate with AI services to parse the job description
        // For now, return basic parsing
        const parsedData = {
            skills: this.extractSkillsFromText(job.description + (job.requirements || '')),
            experience: this.extractExperienceRequirements(job.description + (job.requirements || '')),
            education: this.extractEducationRequirements(job.description + (job.requirements || '')),
            keywords: this.extractKeywords(job.title, job.description, job.requirements),
        };

        // Update job with parsed data
        job.parsedData = parsedData;
        await this.jobsRepository.save(job);

        return parsedData;
    }

    private extractSkillsFromText(text: string): string[] {
        // Simple skill extraction - in production, this would use AI/NLP
        const commonSkills = [
            'javascript', 'typescript', 'python', 'java', 'c++', 'react', 'angular', 'vue',
            'nodejs', 'express', 'django', 'flask', 'spring', 'hibernate', 'aws', 'docker',
            'kubernetes', 'mongodb', 'postgresql', 'mysql', 'redis', 'git', 'agile', 'scrum'
        ];

        return commonSkills.filter(skill =>
            text.toLowerCase().includes(skill.toLowerCase())
        );
    }

    private extractExperienceRequirements(text: string): string {
        const patterns = [
            /(\d+)\s*[-+]\s*years?/i,
            /(\d+)\s*years?\s*of\s*experience/i,
            /experience\s*:\s*(\d+)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1] + ' years';
            }
        }

        return 'Not specified';
    }

    private extractEducationRequirements(text: string): string {
        const educationKeywords = ['bachelor', 'master', 'phd', 'degree', 'associate'];

        for (const keyword of educationKeywords) {
            if (text.toLowerCase().includes(keyword)) {
                return keyword.charAt(0).toUpperCase() + keyword.slice(1);
            }
        }

        return 'Not specified';
    }

    private extractKeywords(title: string, description: string, requirements?: string): string[] {
        const text = `${title} ${description} ${requirements || ''}`;
        const words = text.toLowerCase().match(/\b\w{3,}\b/g) || [];

        // Count word frequency
        const wordCount = {};
        words.forEach(word => {
            if (!['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'had', 'its', 'new', 'now', 'two', 'who', 'boy', 'may', 'his', 'old', 'out', 'day', 'get', 'has', 'him', 'how', 'man', 'new', 'now', 'old', 'out', 'see', 'two', 'way', 'who'].includes(word)) {
                wordCount[word] = (wordCount[word] || 0) + 1;
            }
        });

        // Return top 20 keywords
        return Object.entries(wordCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 20)
            .map(([word]) => word);
    }
}
