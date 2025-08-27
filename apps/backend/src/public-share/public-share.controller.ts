# Created automatically by Cursor AI(2024 - 12 - 19)

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PublicShareService, CreateShareLinkDto, ShareLinkResponse } from './public-share.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

export class UpdateShareLinkDto {
    customSlug?: string;
    expiresAt?: Date;
    requirePassword?: boolean;
    password?: string;
    isActive?: boolean;
    watermarkSettings?: {
        enabled?: boolean;
        text?: string;
        position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
        opacity?: number;
        fontSize?: number;
        color?: string;
        rotation?: number;
    };
    accessSettings?: {
        allowDownload?: boolean;
        allowPrint?: boolean;
        allowCopy?: boolean;
        showAnalytics?: boolean;
        requireEmail?: boolean;
        maxViews?: number;
    };
}

export class AccessShareDto {
    password?: string;
    viewerEmail?: string;
}

@ApiTags('Public Share Links')
@Controller('public-share')
export class PublicShareController {
    constructor(private readonly publicShareService: PublicShareService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('owner', 'admin', 'editor')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a public share link' })
    @ApiResponse({ status: 201, description: 'Share link created successfully' })
    async createShareLink(
        @Request() req: any,
        @Body() createDto: CreateShareLinkDto
    ): Promise<ShareLinkResponse> {
        return this.publicShareService.createShareLink(
            req.user.orgId,
            req.user.userId,
            createDto
        );
    }

    @Get('my-links')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('owner', 'admin', 'editor', 'viewer')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user\'s share links' })
    @ApiResponse({ status: 200, description: 'Share links retrieved successfully' })
    async getUserShareLinks(@Request() req: any): Promise<ShareLinkResponse[]> {
        return this.publicShareService.getUserShareLinks(req.user.orgId, req.user.userId);
    }

    @Get('my-links/:shareId/analytics')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('owner', 'admin', 'editor')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get analytics for a share link' })
    @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
    async getShareAnalytics(
        @Request() req: any,
        @Param('shareId') shareId: string
    ) {
        return this.publicShareService.getShareAnalytics(req.user.orgId, req.user.userId, shareId);
    }

    @Put('my-links/:shareId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('owner', 'admin', 'editor')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a share link' })
    @ApiResponse({ status: 200, description: 'Share link updated successfully' })
    async updateShareLink(
        @Request() req: any,
        @Param('shareId') shareId: string,
        @Body() updateDto: UpdateShareLinkDto
    ): Promise<ShareLinkResponse> {
        return this.publicShareService.updateShareLink(
            req.user.orgId,
            req.user.userId,
            shareId,
            updateDto
        );
    }

    @Delete('my-links/:shareId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('owner', 'admin', 'editor')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Deactivate a share link' })
    @ApiResponse({ status: 200, description: 'Share link deactivated successfully' })
    async deactivateShareLink(
        @Request() req: any,
        @Param('shareId') shareId: string
    ): Promise<void> {
        return this.publicShareService.deactivateShareLink(req.user.orgId, req.user.userId, shareId);
    }

    // Public endpoints (no authentication required)
    @Get('access/:shareToken')
    @ApiOperation({ summary: 'Access a shared resource' })
    @ApiResponse({ status: 200, description: 'Resource accessed successfully' })
    async accessSharedResource(
        @Param('shareToken') shareToken: string,
        @Query() query: AccessShareDto
    ) {
        return this.publicShareService.getSharedResource(
            shareToken,
            query.password,
            query.viewerEmail
        );
    }

    @Post('access/:shareToken/export')
    @ApiOperation({ summary: 'Export a shared resource' })
    @ApiResponse({ status: 200, description: 'Resource exported successfully' })
    async exportSharedResource(
        @Param('shareToken') shareToken: string,
        @Body() body: { format: 'pdf' | 'docx' | 'markdown'; password?: string }
    ) {
        return this.publicShareService.exportSharedResource(
            shareToken,
            body.format,
            body.password
        );
    }

    @Post('access/:shareToken/track-print')
    @ApiOperation({ summary: 'Track print event for analytics' })
    @ApiResponse({ status: 200, description: 'Print event tracked successfully' })
    async trackPrint(@Param('shareToken') shareToken: string) {
        const shareLink = await this.publicShareService.getShareLink(shareToken);
        await this.publicShareService.trackPrint(shareLink.id);
        return { success: true };
    }
}
