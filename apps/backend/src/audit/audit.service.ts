import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../entities/audit_log.entity';

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLogEntity)
        private readonly repo: Repository<AuditLogEntity>,
    ) { }

    async log(data: Partial<AuditLogEntity>) {
        const auditLog = this.repo.create(data);
        return this.repo.save(auditLog);
    }

    async logAction(params: {
        orgId: string;
        userId: string;
        action: string;
        resourceType: string;
        resourceId?: string;
        oldValues?: any;
        newValues?: any;
        metadata?: any;
        status?: 'success' | 'failure' | 'pending';
    }) {
        return this.log({
            orgId: params.orgId,
            userId: params.userId,
            action: params.action,
            resourceType: params.resourceType as any,
            resourceId: params.resourceId,
            oldValues: params.oldValues,
            newValues: params.newValues,
            metadata: params.metadata,
            status: params.status || 'success'
        });
    }

    async getAuditTrail(params: {
        orgId: string;
        resourceType?: string;
        resourceId?: string;
        userId?: string;
        action?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }) {
        const query = this.repo.createQueryBuilder('audit')
            .where('audit.orgId = :orgId', { orgId: params.orgId });

        if (params.resourceType) {
            query.andWhere('audit.resourceType = :resourceType', { resourceType: params.resourceType });
        }

        if (params.resourceId) {
            query.andWhere('audit.resourceId = :resourceId', { resourceId: params.resourceId });
        }

        if (params.userId) {
            query.andWhere('audit.userId = :userId', { userId: params.userId });
        }

        if (params.action) {
            query.andWhere('audit.action = :action', { action: params.action });
        }

        if (params.startDate) {
            query.andWhere('audit.createdAt >= :startDate', { startDate: params.startDate });
        }

        if (params.endDate) {
            query.andWhere('audit.createdAt <= :endDate', { endDate: params.endDate });
        }

        query.orderBy('audit.createdAt', 'DESC');

        if (params.limit) {
            query.limit(params.limit);
        }

        if (params.offset) {
            query.offset(params.offset);
        }

        return query.getMany();
    }

    async getAuditStats(orgId: string, startDate?: Date, endDate?: Date) {
        const query = this.repo.createQueryBuilder('audit')
            .where('audit.orgId = :orgId', { orgId });

        if (startDate) {
            query.andWhere('audit.createdAt >= :startDate', { startDate });
        }

        if (endDate) {
            query.andWhere('audit.createdAt <= :endDate', { endDate });
        }

        const stats = await query
            .select([
                'audit.action',
                'audit.resourceType',
                'audit.status',
                'COUNT(*) as count'
            ])
            .groupBy('audit.action, audit.resourceType, audit.status')
            .getRawMany();

        const totalActions = await query.getCount();

        const actionCounts = stats.reduce((acc, stat) => {
            const key = `${stat.audit_action}_${stat.audit_resourceType}_${stat.audit_status}`;
            acc[key] = parseInt(stat.count);
            return acc;
        }, {} as Record<string, number>);

        return {
            total: totalActions,
            byAction: actionCounts
        };
    }

    async getUserActivity(userId: string, orgId: string, days: number = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        return this.repo
            .createQueryBuilder('audit')
            .where('audit.userId = :userId', { userId })
            .andWhere('audit.orgId = :orgId', { orgId })
            .andWhere('audit.createdAt >= :startDate', { startDate })
            .orderBy('audit.createdAt', 'DESC')
            .getMany();
    }

    async getResourceHistory(resourceType: string, resourceId: string, orgId: string) {
        return this.repo
            .createQueryBuilder('audit')
            .where('audit.resourceType = :resourceType', { resourceType })
            .andWhere('audit.resourceId = :resourceId', { resourceId })
            .andWhere('audit.orgId = :orgId', { orgId })
            .orderBy('audit.createdAt', 'ASC')
            .getMany();
    }

    async getRecentActivity(orgId: string, limit: number = 50) {
        return this.repo
            .createQueryBuilder('audit')
            .where('audit.orgId = :orgId', { orgId })
            .orderBy('audit.createdAt', 'DESC')
            .limit(limit)
            .getMany();
    }

    async getFailedActions(orgId: string, startDate?: Date, endDate?: Date) {
        const query = this.repo.createQueryBuilder('audit')
            .where('audit.orgId = :orgId', { orgId })
            .andWhere('audit.status = :status', { status: 'failure' });

        if (startDate) {
            query.andWhere('audit.createdAt >= :startDate', { startDate });
        }

        if (endDate) {
            query.andWhere('audit.createdAt <= :endDate', { endDate });
        }

        return query.orderBy('audit.createdAt', 'DESC').getMany();
    }

    async searchAuditLogs(orgId: string, searchTerm: string) {
        return this.repo
            .createQueryBuilder('audit')
            .where('audit.orgId = :orgId', { orgId })
            .andWhere(
                '(audit.action ILIKE :searchTerm OR audit.resourceType ILIKE :searchTerm OR audit.metadata::text ILIKE :searchTerm)',
                { searchTerm: `%${searchTerm}%` }
            )
            .orderBy('audit.createdAt', 'DESC')
            .getMany();
    }

    async cleanupOldLogs(orgId: string, daysToKeep: number = 365) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await this.repo
            .createQueryBuilder()
            .delete()
            .where('orgId = :orgId', { orgId })
            .andWhere('createdAt < :cutoffDate', { cutoffDate })
            .execute();

        return { deletedCount: result.affected || 0 };
    }

    async exportAuditLogs(orgId: string, startDate?: Date, endDate?: Date) {
        const query = this.repo.createQueryBuilder('audit')
            .where('audit.orgId = :orgId', { orgId });

        if (startDate) {
            query.andWhere('audit.createdAt >= :startDate', { startDate });
        }

        if (endDate) {
            query.andWhere('audit.createdAt <= :endDate', { endDate });
        }

        return query.orderBy('audit.createdAt', 'ASC').getMany();
    }
}
