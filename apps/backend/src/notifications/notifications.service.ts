import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from '../entities/notification.entity';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(NotificationEntity)
        private readonly repo: Repository<NotificationEntity>,
    ) { }

    async create(data: Partial<NotificationEntity>) {
        const notification = this.repo.create(data);
        return this.repo.save(notification);
    }

    async update(id: string, data: Partial<NotificationEntity>) {
        await this.repo.update(id, data);
        return this.get(id);
    }

    async get(id: string) {
        return this.repo.findOne({ where: { id } });
    }

    async delete(id: string) {
        return this.repo.delete(id);
    }

    async list(userId: string, orgId: string, filters?: {
        type?: string;
        isRead?: boolean;
        isArchived?: boolean;
        category?: string;
        limit?: number;
        offset?: number;
    }) {
        const query = this.repo.createQueryBuilder('notification')
            .where('notification.userId = :userId', { userId })
            .andWhere('notification.orgId = :orgId', { orgId });

        if (filters?.type) {
            query.andWhere('notification.type = :type', { type: filters.type });
        }

        if (filters?.isRead !== undefined) {
            query.andWhere('notification.isRead = :isRead', { isRead: filters.isRead });
        }

        if (filters?.isArchived !== undefined) {
            query.andWhere('notification.isArchived = :isArchived', { isArchived: filters.isArchived });
        }

        if (filters?.category) {
            query.andWhere('notification.data->>\'category\' = :category', { category: filters.category });
        }

        query.orderBy('notification.createdAt', 'DESC');

        if (filters?.limit) {
            query.limit(filters.limit);
        }

        if (filters?.offset) {
            query.offset(filters.offset);
        }

        return query.getMany();
    }

    async markAsRead(id: string, userId: string) {
        const notification = await this.get(id);
        if (!notification || notification.userId !== userId) {
            throw new BadRequestException('Notification not found or access denied');
        }

        await this.repo.update(id, {
            isRead: true,
            readAt: new Date()
        });

        return this.get(id);
    }

    async markAllAsRead(userId: string, orgId: string) {
        await this.repo.update(
            { userId, orgId, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        return { success: true, updatedCount: 1 };
    }

    async archive(id: string, userId: string) {
        const notification = await this.get(id);
        if (!notification || notification.userId !== userId) {
            throw new BadRequestException('Notification not found or access denied');
        }

        await this.repo.update(id, {
            isArchived: true,
            archivedAt: new Date()
        });

        return this.get(id);
    }

    async unarchive(id: string, userId: string) {
        const notification = await this.get(id);
        if (!notification || notification.userId !== userId) {
            throw new BadRequestException('Notification not found or access denied');
        }

        await this.repo.update(id, {
            isArchived: false,
            archivedAt: null
        });

        return this.get(id);
    }

    async getUnreadCount(userId: string, orgId: string) {
        return this.repo.count({
            where: { userId, orgId, isRead: false, isArchived: false }
        });
    }

    async getNotificationStats(userId: string, orgId: string) {
        const stats = await this.repo
            .createQueryBuilder('notification')
            .select([
                'notification.type',
                'notification.isRead',
                'notification.isArchived',
                'COUNT(*) as count'
            ])
            .where('notification.userId = :userId', { userId })
            .andWhere('notification.orgId = :orgId', { orgId })
            .groupBy('notification.type, notification.isRead, notification.isArchived')
            .getRawMany();

        const totalNotifications = await this.repo.count({
            where: { userId, orgId }
        });

        const unreadNotifications = await this.repo.count({
            where: { userId, orgId, isRead: false, isArchived: false }
        });

        const archivedNotifications = await this.repo.count({
            where: { userId, orgId, isArchived: true }
        });

        const typeCounts = stats.reduce((acc, stat) => {
            const key = `${stat.notification_type}_${stat.notification_isRead}_${stat.notification_isArchived}`;
            acc[key] = parseInt(stat.count);
            return acc;
        }, {} as Record<string, number>);

        return {
            total: totalNotifications,
            unread: unreadNotifications,
            archived: archivedNotifications,
            byType: typeCounts
        };
    }

    async createSystemNotification(
        orgId: string,
        userId: string,
        type: 'info' | 'success' | 'warning' | 'error' | 'reminder' | 'update',
        title: string,
        message: string,
        data?: any
    ) {
        return this.create({
            orgId,
            userId,
            type,
            title,
            message,
            data,
            deliveryChannels: { inApp: true }
        });
    }

    async createBulkNotification(
        orgId: string,
        userIds: string[],
        type: 'info' | 'success' | 'warning' | 'error' | 'reminder' | 'update',
        title: string,
        message: string,
        data?: any
    ) {
        const notifications = userIds.map(userId => ({
            orgId,
            userId,
            type,
            title,
            message,
            data,
            deliveryChannels: { inApp: true }
        }));

        return this.repo.save(notifications);
    }

    async deleteExpiredNotifications() {
        const result = await this.repo
            .createQueryBuilder()
            .delete()
            .where('expiresAt IS NOT NULL AND expiresAt < :now', { now: new Date() })
            .execute();

        return { success: true, deletedCount: result.affected || 0 };
    }

    async searchNotifications(
        userId: string,
        orgId: string,
        query: string,
        filters?: {
            type?: string;
            isRead?: boolean;
            isArchived?: boolean;
        }
    ) {
        const queryBuilder = this.repo
            .createQueryBuilder('notification')
            .where('notification.userId = :userId', { userId })
            .andWhere('notification.orgId = :orgId', { orgId })
            .andWhere(
                '(notification.title ILIKE :query OR notification.message ILIKE :query)',
                { query: `%${query}%` }
            );

        if (filters?.type) {
            queryBuilder.andWhere('notification.type = :type', { type: filters.type });
        }

        if (filters?.isRead !== undefined) {
            queryBuilder.andWhere('notification.isRead = :isRead', { isRead: filters.isRead });
        }

        if (filters?.isArchived !== undefined) {
            queryBuilder.andWhere('notification.isArchived = :isArchived', { isArchived: filters.isArchived });
        }

        return queryBuilder.orderBy('notification.createdAt', 'DESC').getMany();
    }

    async getNotificationsByCategory(userId: string, orgId: string, category: string) {
        return this.repo
            .createQueryBuilder('notification')
            .where('notification.userId = :userId', { userId })
            .andWhere('notification.orgId = :orgId', { orgId })
            .andWhere('notification.data->>\'category\' = :category', { category })
            .orderBy('notification.createdAt', 'DESC')
            .getMany();
    }

    async updateDeliveryStatus(
        id: string,
        channel: 'email' | 'push' | 'inApp' | 'sms',
        status: 'pending' | 'sent' | 'failed'
    ) {
        const notification = await this.get(id);
        if (!notification) {
            throw new BadRequestException('Notification not found');
        }

        const deliveryStatus = notification.deliveryStatus || {};
        deliveryStatus[channel] = status;

        await this.repo.update(id, { deliveryStatus });
        return this.get(id);
    }
}
