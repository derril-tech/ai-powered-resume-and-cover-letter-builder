import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeadLetterQueueEntity } from '../entities/dead_letter_queue.entity';

@Injectable()
export class DeadLetterQueueService {
    constructor(
        @InjectRepository(DeadLetterQueueEntity)
        private readonly repo: Repository<DeadLetterQueueEntity>,
    ) { }

    async create(data: Partial<DeadLetterQueueEntity>) {
        const dlqEntry = this.repo.create(data);
        return this.repo.save(dlqEntry);
    }

    async update(id: string, data: Partial<DeadLetterQueueEntity>) {
        await this.repo.update(id, data);
        return this.get(id);
    }

    async get(id: string) {
        return this.repo.findOne({ where: { id } });
    }

    async delete(id: string) {
        return this.repo.delete(id);
    }

    async addToDLQ(
        orgId: string,
        queueName: string,
        messageType: string,
        originalMessage: any,
        error: Error | string,
        metadata?: {
            sourceWorker?: string;
            targetWorker?: string;
            priority?: 'low' | 'normal' | 'high' | 'urgent';
            tags?: string[];
            correlationId?: string;
            traceId?: string;
        }
    ) {
        const errorObj = typeof error === 'string'
            ? { message: error }
            : {
                message: error.message,
                stack: error.stack,
                code: (error as any).code,
                details: (error as any).details
            };

        const dlqEntry = this.repo.create({
            orgId,
            queueName,
            messageType,
            originalMessage,
            error: errorObj,
            status: 'failed',
            metadata,
            nextRetryAt: this.calculateNextRetryTime(0)
        });

        return this.repo.save(dlqEntry);
    }

    async retryMessage(id: string) {
        const dlqEntry = await this.get(id);
        if (!dlqEntry) {
            throw new BadRequestException('DLQ entry not found');
        }

        if (dlqEntry.status === 'processed') {
            throw new BadRequestException('Message already processed');
        }

        if (dlqEntry.retryCount >= dlqEntry.maxRetries) {
            await this.repo.update(id, { status: 'abandoned' });
            throw new BadRequestException('Max retries exceeded');
        }

        const newRetryCount = dlqEntry.retryCount + 1;
        const nextRetryAt = this.calculateNextRetryTime(newRetryCount);

        await this.repo.update(id, {
            retryCount: newRetryCount,
            status: 'retrying',
            nextRetryAt,
            processingHistory: [
                ...(dlqEntry.processingHistory || []),
                {
                    attempt: newRetryCount,
                    timestamp: new Date(),
                    error: 'Retry initiated'
                }
            ]
        });

        return this.get(id);
    }

    async markAsProcessed(id: string, result?: any) {
        const dlqEntry = await this.get(id);
        if (!dlqEntry) {
            throw new BadRequestException('DLQ entry not found');
        }

        const processingHistory = [
            ...(dlqEntry.processingHistory || []),
            {
                attempt: dlqEntry.retryCount + 1,
                timestamp: new Date(),
                result
            }
        ];

        await this.repo.update(id, {
            status: 'processed',
            processedAt: new Date(),
            processingHistory
        });

        return this.get(id);
    }

    async markAsFailed(id: string, error: Error | string) {
        const dlqEntry = await this.get(id);
        if (!dlqEntry) {
            throw new BadRequestException('DLQ entry not found');
        }

        const errorObj = typeof error === 'string'
            ? { message: error }
            : {
                message: error.message,
                stack: error.stack,
                code: (error as any).code,
                details: (error as any).details
            };

        const processingHistory = [
            ...(dlqEntry.processingHistory || []),
            {
                attempt: dlqEntry.retryCount + 1,
                timestamp: new Date(),
                error: errorObj.message
            }
        ];

        await this.repo.update(id, {
            status: 'failed',
            error: errorObj,
            processingHistory
        });

        return this.get(id);
    }

    async getRetryableMessages(limit: number = 10) {
        return this.repo
            .createQueryBuilder('dlq')
            .where('dlq.status IN (:...statuses)', { statuses: ['failed', 'retrying'] })
            .andWhere('dlq.retryCount < dlq.maxRetries')
            .andWhere('dlq.nextRetryAt <= :now', { now: new Date() })
            .orderBy('dlq.metadata->>\'priority\'', 'DESC')
            .addOrderBy('dlq.createdAt', 'ASC')
            .limit(limit)
            .getMany();
    }

    async getMessagesByQueue(queueName: string, orgId: string, filters?: {
        status?: string;
        messageType?: string;
        limit?: number;
        offset?: number;
    }) {
        const query = this.repo.createQueryBuilder('dlq')
            .where('dlq.queueName = :queueName', { queueName })
            .andWhere('dlq.orgId = :orgId', { orgId });

        if (filters?.status) {
            query.andWhere('dlq.status = :status', { status: filters.status });
        }

        if (filters?.messageType) {
            query.andWhere('dlq.messageType = :messageType', { messageType: filters.messageType });
        }

        query.orderBy('dlq.createdAt', 'DESC');

        if (filters?.limit) {
            query.limit(filters.limit);
        }

        if (filters?.offset) {
            query.offset(filters.offset);
        }

        return query.getMany();
    }

    async getDLQStats(orgId: string) {
        const stats = await this.repo
            .createQueryBuilder('dlq')
            .select([
                'dlq.status',
                'dlq.messageType',
                'dlq.queueName',
                'COUNT(*) as count'
            ])
            .where('dlq.orgId = :orgId', { orgId })
            .groupBy('dlq.status, dlq.messageType, dlq.queueName')
            .getRawMany();

        const totalMessages = await this.repo.count({
            where: { orgId }
        });

        const failedMessages = await this.repo.count({
            where: { orgId, status: 'failed' }
        });

        const retryingMessages = await this.repo.count({
            where: { orgId, status: 'retrying' }
        });

        const processedMessages = await this.repo.count({
            where: { orgId, status: 'processed' }
        });

        const abandonedMessages = await this.repo.count({
            where: { orgId, status: 'abandoned' }
        });

        const typeCounts = stats.reduce((acc, stat) => {
            const key = `${stat.dlq_messageType}_${stat.dlq_status}`;
            acc[key] = parseInt(stat.count);
            return acc;
        }, {} as Record<string, number>);

        return {
            total: totalMessages,
            failed: failedMessages,
            retrying: retryingMessages,
            processed: processedMessages,
            abandoned: abandonedMessages,
            byType: typeCounts
        };
    }

    async cleanupProcessedMessages(olderThanDays: number = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const result = await this.repo
            .createQueryBuilder()
            .delete()
            .where('status = :status', { status: 'processed' })
            .andWhere('processedAt < :cutoffDate', { cutoffDate })
            .execute();

        return { success: true, deletedCount: result.affected || 0 };
    }

    async cleanupAbandonedMessages(olderThanDays: number = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const result = await this.repo
            .createQueryBuilder()
            .delete()
            .where('status = :status', { status: 'abandoned' })
            .andWhere('updatedAt < :cutoffDate', { cutoffDate })
            .execute();

        return { success: true, deletedCount: result.affected || 0 };
    }

    async searchDLQ(
        orgId: string,
        query: string,
        filters?: {
            status?: string;
            messageType?: string;
            queueName?: string;
        }
    ) {
        const queryBuilder = this.repo
            .createQueryBuilder('dlq')
            .where('dlq.orgId = :orgId', { orgId })
            .andWhere(
                '(dlq.messageType ILIKE :query OR dlq.queueName ILIKE :query OR dlq.error->>\'message\' ILIKE :query)',
                { query: `%${query}%` }
            );

        if (filters?.status) {
            queryBuilder.andWhere('dlq.status = :status', { status: filters.status });
        }

        if (filters?.messageType) {
            queryBuilder.andWhere('dlq.messageType = :messageType', { messageType: filters.messageType });
        }

        if (filters?.queueName) {
            queryBuilder.andWhere('dlq.queueName = :queueName', { queueName: filters.queueName });
        }

        return queryBuilder.orderBy('dlq.createdAt', 'DESC').getMany();
    }

    private calculateNextRetryTime(retryCount: number): Date {
        // Exponential backoff: 2^retryCount minutes, capped at 24 hours
        const baseDelayMinutes = Math.min(Math.pow(2, retryCount), 1440);
        const nextRetry = new Date();
        nextRetry.setMinutes(nextRetry.getMinutes() + baseDelayMinutes);
        return nextRetry;
    }
}
