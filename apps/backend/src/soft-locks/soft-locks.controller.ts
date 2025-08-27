import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { SoftLocksService } from './soft-locks.service';

@Controller('soft-locks')
export class SoftLocksController {
    constructor(private readonly softLocksService: SoftLocksService) { }

    @Get('variant/:variantId')
    async getLocksByVariant(
        @Param('variantId') variantId: string,
        @Query('orgId') orgId: string
    ) {
        return this.softLocksService.getLocksByVariant(variantId, orgId);
    }

    @Get('user/:userId')
    async getLocksByUser(
        @Param('userId') userId: string,
        @Query('orgId') orgId: string
    ) {
        return this.softLocksService.getLocksByUser(userId, orgId);
    }

    @Get('active/:variantId')
    async getActiveLock(
        @Param('variantId') variantId: string,
        @Query('orgId') orgId: string
    ) {
        return this.softLocksService.getActiveLock(variantId, orgId);
    }

    @Get('expired')
    async getExpiredLocks() {
        return this.softLocksService.getExpiredLocks();
    }

    @Get('stats')
    async getLockStats(@Query('orgId') orgId: string) {
        return this.softLocksService.getLockStats(orgId);
    }

    @Get(':id')
    async get(@Param('id') id: string) {
        return this.softLocksService.get(id);
    }

    @Post('acquire')
    async acquireLock(@Body() data: {
        orgId: string;
        userId: string;
        variantId: string;
        lockType: 'edit' | 'review' | 'approval' | 'export';
        durationMinutes?: number;
        scope?: {
            sections?: string[];
            fields?: string[];
            readOnly?: boolean;
        };
        reason?: string;
    }) {
        return this.softLocksService.acquireLock(
            data.orgId,
            data.userId,
            data.variantId,
            data.lockType,
            data.durationMinutes,
            data.scope,
            data.reason
        );
    }

    @Put(':id/release')
    async releaseLock(
        @Param('id') id: string,
        @Body() data: { userId: string }
    ) {
        return this.softLocksService.releaseLock(id, data.userId);
    }

    @Put(':id/force-release')
    async forceReleaseLock(
        @Param('id') id: string,
        @Body() data: { releasedBy: string; reason?: string }
    ) {
        return this.softLocksService.forceReleaseLock(id, data.releasedBy, data.reason);
    }

    @Put(':id/extend')
    async extendLock(
        @Param('id') id: string,
        @Body() data: { additionalMinutes?: number }
    ) {
        return this.softLocksService.extendLock(id, data.additionalMinutes);
    }

    @Put(':id/activity')
    async updateActivity(
        @Param('id') id: string,
        @Body() data: { action: string }
    ) {
        return this.softLocksService.updateActivity(id, data.action);
    }

    @Post('check-permission')
    async checkLockPermission(@Body() data: {
        variantId: string;
        orgId: string;
        userId: string;
        action: string;
    }) {
        return this.softLocksService.checkLockPermission(
            data.variantId,
            data.orgId,
            data.userId,
            data.action
        );
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.softLocksService.delete(id);
    }

    @Delete('cleanup/expired')
    async cleanupExpiredLocks() {
        return this.softLocksService.cleanupExpiredLocks();
    }
}
