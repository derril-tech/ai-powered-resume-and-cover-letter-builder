import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { DeadLetterQueueService } from './dead-letter-queue.service';

@Controller('dead-letter-queue')
export class DeadLetterQueueController {
    constructor(private readonly dlqService: DeadLetterQueueService) { }

    @Get('stats')
    async getDLQStats(@Query('orgId') orgId: string) {
        return this.dlqService.getDLQStats(orgId);
    }

    @Get('retryable')
    async getRetryableMessages(@Query('limit') limit?: number) {
        return this.dlqService.getRetryableMessages(limit);
    }

    @Get('queue/:queueName')
    async getMessagesByQueue(
        @Param('queueName') queueName: string,
        @Query('orgId') orgId: string,
        @Query('status') status?: string,
        @Query('messageType') messageType?: string,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number
    ) {
        const filters = { status, messageType, limit, offset };
        return this.dlqService.getMessagesByQueue(queueName, orgId, filters);
    }

    @Get('search')
    async searchDLQ(
        @Query('orgId') orgId: string,
        @Query('query') query: string,
        @Query('status') status?: string,
        @Query('messageType') messageType?: string,
        @Query('queueName') queueName?: string
    ) {
        const filters = { status, messageType, queueName };
        return this.dlqService.searchDLQ(orgId, query, filters);
    }

    @Get(':id')
    async get(@Param('id') id: string) {
        return this.dlqService.get(id);
    }

    @Post('add')
    async addToDLQ(@Body() data: {
        orgId: string;
        queueName: string;
        messageType: string;
        originalMessage: any;
        error: string | Error;
        metadata?: {
            sourceWorker?: string;
            targetWorker?: string;
            priority?: 'low' | 'normal' | 'high' | 'urgent';
            tags?: string[];
            correlationId?: string;
            traceId?: string;
        };
    }) {
        return this.dlqService.addToDLQ(
            data.orgId,
            data.queueName,
            data.messageType,
            data.originalMessage,
            data.error,
            data.metadata
        );
    }

    @Put(':id/retry')
    async retryMessage(@Param('id') id: string) {
        return this.dlqService.retryMessage(id);
    }

    @Put(':id/processed')
    async markAsProcessed(
        @Param('id') id: string,
        @Body() data: { result?: any }
    ) {
        return this.dlqService.markAsProcessed(id, data.result);
    }

    @Put(':id/failed')
    async markAsFailed(
        @Param('id') id: string,
        @Body() data: { error: string | Error }
    ) {
        return this.dlqService.markAsFailed(id, data.error);
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() data: Partial<{
            status: 'failed' | 'retrying' | 'processed' | 'abandoned';
            maxRetries: number;
            metadata: any;
        }>
    ) {
        return this.dlqService.update(id, data);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.dlqService.delete(id);
    }

    @Delete('cleanup/processed')
    async cleanupProcessedMessages(@Query('olderThanDays') olderThanDays?: number) {
        return this.dlqService.cleanupProcessedMessages(olderThanDays);
    }

    @Delete('cleanup/abandoned')
    async cleanupAbandonedMessages(@Query('olderThanDays') olderThanDays?: number) {
        return this.dlqService.cleanupAbandonedMessages(olderThanDays);
    }
}
