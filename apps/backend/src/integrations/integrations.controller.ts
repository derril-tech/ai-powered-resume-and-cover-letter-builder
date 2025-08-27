import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';

class CreateIntegrationDto {
    type!: 'linkedin' | 'json_resume' | 'google_drive' | 'dropbox';
    name!: string;
    config!: {
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: string;
        profileUrl?: string;
        filePath?: string;
        syncEnabled: boolean;
        lastSyncAt?: string;
    };
}

class UpdateIntegrationDto {
    name?: string;
    config?: {
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: string;
        profileUrl?: string;
        filePath?: string;
        syncEnabled?: boolean;
        lastSyncAt?: string;
    };
}

class ImportJsonResumeDto {
    jsonData!: any;
}

@Controller('integrations')
export class IntegrationsController {
    constructor(private readonly integrations: IntegrationsService) { }

    @Get()
    async list(@Query('orgId') orgId: string, @Query('userId') userId: string) {
        return this.integrations.list(orgId, userId);
    }

    @Get(':id')
    async get(@Param('id') id: string) {
        return this.integrations.get(id);
    }

    @Post()
    async create(@Body() dto: CreateIntegrationDto) {
        return this.integrations.create(dto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateIntegrationDto) {
        return this.integrations.update(id, dto);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.integrations.delete(id);
    }

    @Post(':id/sync/linkedin')
    async syncLinkedIn(@Param('id') id: string) {
        return this.integrations.syncLinkedIn(id);
    }

    @Post(':id/sync/google-drive')
    async syncGoogleDrive(@Param('id') id: string) {
        return this.integrations.syncGoogleDrive(id);
    }

    @Post(':id/sync/dropbox')
    async syncDropbox(@Param('id') id: string) {
        return this.integrations.syncDropbox(id);
    }

    @Post(':id/import/json-resume')
    async importJsonResume(@Param('id') id: string, @Body() dto: ImportJsonResumeDto) {
        return this.integrations.importJsonResume(id, dto.jsonData);
    }

    @Get('auth/:type/url')
    async getAuthUrl(@Param('type') type: string, @Query('redirectUri') redirectUri: string) {
        return this.integrations.getAuthUrl(type, redirectUri);
    }

    @Post('auth/:type/callback')
    async handleOAuthCallback(
        @Param('type') type: string,
        @Query('code') code: string,
        @Query('redirectUri') redirectUri: string
    ) {
        return this.integrations.handleOAuthCallback(type, code, redirectUri);
    }
}
