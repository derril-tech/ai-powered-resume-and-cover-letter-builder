import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ExportRequestsService } from './export-requests.service';

class CreateExportRequestDto {
    variantId!: string;
    format!: 'pdf' | 'docx' | 'markdown' | 'google_docs' | 'email';
    name!: string;
    config!: {
        templateId?: string;
        includeCoverLetter?: boolean;
        emailTo?: string;
        googleDocsTitle?: string;
        watermark?: boolean;
        password?: string;
        quality?: 'standard' | 'high' | 'print';
    };
}

class UpdateExportRequestDto {
    name?: string;
    config?: {
        templateId?: string;
        includeCoverLetter?: boolean;
        emailTo?: string;
        googleDocsTitle?: string;
        watermark?: boolean;
        password?: string;
        quality?: 'standard' | 'high' | 'print';
    };
}

@Controller('export-requests')
export class ExportRequestsController {
    constructor(private readonly exportRequests: ExportRequestsService) { }

    @Get()
    async list(@Query('orgId') orgId: string, @Query('userId') userId: string) {
        return this.exportRequests.list(orgId, userId);
    }

    @Get(':id')
    async get(@Param('id') id: string) {
        return this.exportRequests.get(id);
    }

    @Get(':id/status')
    async getStatus(@Param('id') id: string) {
        return this.exportRequests.getExportStatus(id);
    }

    @Post()
    async create(@Body() dto: CreateExportRequestDto) {
        return this.exportRequests.create(dto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateExportRequestDto) {
        return this.exportRequests.update(id, dto);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.exportRequests.delete(id);
    }

    @Post(':id/export/pdf')
    async exportToPdf(@Param('id') id: string) {
        return this.exportRequests.exportToPdf(id);
    }

    @Post(':id/export/docx')
    async exportToDocx(@Param('id') id: string) {
        return this.exportRequests.exportToDocx(id);
    }

    @Post(':id/export/markdown')
    async exportToMarkdown(@Param('id') id: string) {
        return this.exportRequests.exportToMarkdown(id);
    }

    @Post(':id/export/google-docs')
    async exportToGoogleDocs(@Param('id') id: string) {
        return this.exportRequests.exportToGoogleDocs(id);
    }

    @Post(':id/export/email')
    async exportToEmail(@Param('id') id: string) {
        return this.exportRequests.exportToEmail(id);
    }

    @Post(':id/retry')
    async retryExport(@Param('id') id: string) {
        return this.exportRequests.retryExport(id);
    }
}
