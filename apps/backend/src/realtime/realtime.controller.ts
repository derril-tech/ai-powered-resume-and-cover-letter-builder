import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { RealtimeService } from './realtime.service';

class CreateConnectionDto {
    connectionId!: string;
    metadata?: {
        userAgent?: string;
        ipAddress?: string;
        currentPage?: string;
        currentProject?: string;
        currentVariant?: string;
    };
}

class UpdateActivityDto {
    currentPage?: string;
    currentProject?: string;
    currentVariant?: string;
}

class SendBulletSuggestionsDto {
    variantId!: string;
    suggestions!: any[];
}

class SendATSScoreUpdateDto {
    variantId!: string;
    score!: number;
    details!: any;
}

class SendCollaborationUpdateDto {
    projectId!: string;
    variantId!: string;
    update!: any;
}

@Controller('realtime')
export class RealtimeController {
    constructor(private readonly realtime: RealtimeService) { }

    @Post('connections')
    async createConnection(@Body() dto: CreateConnectionDto) {
        return this.realtime.createConnection(dto);
    }

    @Put('connections/:connectionId/activity')
    async updateActivity(@Param('connectionId') connectionId: string, @Body() dto: UpdateActivityDto) {
        return this.realtime.updateActivity(connectionId, dto);
    }

    @Post('connections/:connectionId/disconnect')
    async disconnectConnection(@Param('connectionId') connectionId: string) {
        return this.realtime.disconnectConnection(connectionId);
    }

    @Get('presence/:orgId')
    async getPresence(@Param('orgId') orgId: string, @Query('projectId') projectId?: string) {
        return this.realtime.getPresence(orgId, projectId);
    }

    @Get('connections/:orgId/stats')
    async getConnectionStats(@Param('orgId') orgId: string) {
        return this.realtime.getConnectionStats(orgId);
    }

    @Post('bullet-suggestions/:userId')
    async sendBulletSuggestions(@Param('userId') userId: string, @Body() dto: SendBulletSuggestionsDto) {
        return this.realtime.sendBulletSuggestions(userId, dto.variantId, dto.suggestions);
    }

    @Post('ats-score-update/:userId')
    async sendATSScoreUpdate(@Param('userId') userId: string, @Body() dto: SendATSScoreUpdateDto) {
        return this.realtime.sendATSScoreUpdate(userId, dto.variantId, dto.score, dto.details);
    }

    @Post('presence-update/:orgId/:userId')
    async sendPresenceUpdate(
        @Param('orgId') orgId: string,
        @Param('userId') userId: string,
        @Body('status') status: string,
        @Body('metadata') metadata: any
    ) {
        return this.realtime.sendPresenceUpdate(orgId, userId, status, metadata);
    }

    @Post('collaboration-update')
    async sendCollaborationUpdate(@Body() dto: SendCollaborationUpdateDto) {
        return this.realtime.sendCollaborationUpdate(dto.projectId, dto.variantId, dto.update);
    }

    @Post('subscribe/:userId/:variantId')
    async subscribeToVariant(@Param('userId') userId: string, @Param('variantId') variantId: string) {
        return this.realtime.subscribeToVariant(userId, variantId);
    }

    @Post('unsubscribe/:userId/:variantId')
    async unsubscribeFromVariant(@Param('userId') userId: string, @Param('variantId') variantId: string) {
        return this.realtime.unsubscribeFromVariant(userId, variantId);
    }

    @Post('broadcast/:projectId')
    async broadcastToProject(
        @Param('projectId') projectId: string,
        @Body('event') event: string,
        @Body('data') data: any
    ) {
        return this.realtime.broadcastToProject(projectId, event, data);
    }

    @Post('send/:userId')
    async sendToUser(
        @Param('userId') userId: string,
        @Body('event') event: string,
        @Body('data') data: any
    ) {
        return this.realtime.sendToUser(userId, event, data);
    }

    @Post('send-org/:orgId')
    async sendToOrg(
        @Param('orgId') orgId: string,
        @Body('event') event: string,
        @Body('data') data: any
    ) {
        return this.realtime.sendToOrg(orgId, event, data);
    }
}
