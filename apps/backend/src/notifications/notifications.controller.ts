import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    async list(
        @Query('userId') userId: string,
        @Query('orgId') orgId: string,
        @Query('type') type?: string,
        @Query('isRead') isRead?: boolean,
        @Query('isArchived') isArchived?: boolean,
        @Query('category') category?: string,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number
    ) {
        const filters = {
            type,
            isRead,
            isArchived,
            category,
            limit,
            offset
        };

        return this.notificationsService.list(userId, orgId, filters);
    }

    @Get('unread-count')
    async getUnreadCount(
        @Query('userId') userId: string,
        @Query('orgId') orgId: string
    ) {
        return this.notificationsService.getUnreadCount(userId, orgId);
    }

    @Get('stats')
    async getNotificationStats(
        @Query('userId') userId: string,
        @Query('orgId') orgId: string
    ) {
        return this.notificationsService.getNotificationStats(userId, orgId);
    }

    @Get('search')
    async searchNotifications(
        @Query('userId') userId: string,
        @Query('orgId') orgId: string,
        @Query('query') query: string,
        @Query('type') type?: string,
        @Query('isRead') isRead?: boolean,
        @Query('isArchived') isArchived?: boolean
    ) {
        const filters = { type, isRead, isArchived };
        return this.notificationsService.searchNotifications(userId, orgId, query, filters);
    }

    @Get('category/:category')
    async getNotificationsByCategory(
        @Query('userId') userId: string,
        @Query('orgId') orgId: string,
        @Param('category') category: string
    ) {
        return this.notificationsService.getNotificationsByCategory(userId, orgId, category);
    }

    @Get(':id')
    async get(@Param('id') id: string) {
        return this.notificationsService.get(id);
    }

    @Post()
    async create(@Body() data: {
        orgId: string;
        userId: string;
        type: 'info' | 'success' | 'warning' | 'error' | 'reminder' | 'update';
        title: string;
        message: string;
        data?: any;
        deliveryChannels?: {
            email?: boolean;
            push?: boolean;
            inApp?: boolean;
            sms?: boolean;
        };
        expiresAt?: Date;
    }) {
        return this.notificationsService.create(data);
    }

    @Post('system')
    async createSystemNotification(@Body() data: {
        orgId: string;
        userId: string;
        type: 'info' | 'success' | 'warning' | 'error' | 'reminder' | 'update';
        title: string;
        message: string;
        data?: any;
    }) {
        return this.notificationsService.createSystemNotification(
            data.orgId,
            data.userId,
            data.type,
            data.title,
            data.message,
            data.data
        );
    }

    @Post('bulk')
    async createBulkNotification(@Body() data: {
        orgId: string;
        userIds: string[];
        type: 'info' | 'success' | 'warning' | 'error' | 'reminder' | 'update';
        title: string;
        message: string;
        data?: any;
    }) {
        return this.notificationsService.createBulkNotification(
            data.orgId,
            data.userIds,
            data.type,
            data.title,
            data.message,
            data.data
        );
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() data: Partial<{
            type: 'info' | 'success' | 'warning' | 'error' | 'reminder' | 'update';
            title: string;
            message: string;
            data: any;
            deliveryChannels: {
                email?: boolean;
                push?: boolean;
                inApp?: boolean;
                sms?: boolean;
            };
            expiresAt: Date;
        }>
    ) {
        return this.notificationsService.update(id, data);
    }

    @Put(':id/read')
    async markAsRead(
        @Param('id') id: string,
        @Body() data: { userId: string }
    ) {
        return this.notificationsService.markAsRead(id, data.userId);
    }

    @Put('mark-all-read')
    async markAllAsRead(@Body() data: { userId: string; orgId: string }) {
        return this.notificationsService.markAllAsRead(data.userId, data.orgId);
    }

    @Put(':id/archive')
    async archive(
        @Param('id') id: string,
        @Body() data: { userId: string }
    ) {
        return this.notificationsService.archive(id, data.userId);
    }

    @Put(':id/unarchive')
    async unarchive(
        @Param('id') id: string,
        @Body() data: { userId: string }
    ) {
        return this.notificationsService.unarchive(id, data.userId);
    }

    @Put(':id/delivery-status')
    async updateDeliveryStatus(
        @Param('id') id: string,
        @Body() data: {
            channel: 'email' | 'push' | 'inApp' | 'sms';
            status: 'pending' | 'sent' | 'failed';
        }
    ) {
        return this.notificationsService.updateDeliveryStatus(id, data.channel, data.status);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.notificationsService.delete(id);
    }

    @Delete('expired')
    async deleteExpiredNotifications() {
        return this.notificationsService.deleteExpiredNotifications();
    }
}
