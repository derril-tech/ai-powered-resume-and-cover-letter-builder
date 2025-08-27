import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { TemplatesService } from './templates.service';

class CreateTemplateDto {
    name!: string;
    style!: 'modern' | 'classic' | 'minimalist';
    atsSafe?: boolean;
    layout!: {
        sections: string[];
        columns: number;
        projectHighlights: boolean;
        headerStyle: 'centered' | 'left' | 'split';
        fontFamily: string;
        fontSize: number;
        lineSpacing: number;
        margins: { top: number; right: number; bottom: number; left: number };
    };
    orgId?: string;
}

class UpdateTemplateDto {
    name?: string;
    style?: 'modern' | 'classic' | 'minimalist';
    atsSafe?: boolean;
    layout?: {
        sections: string[];
        columns: number;
        projectHighlights: boolean;
        headerStyle: 'centered' | 'left' | 'split';
        fontFamily: string;
        fontSize: number;
        lineSpacing: number;
        margins: { top: number; right: number; bottom: number; left: number };
    };
}

@Controller('templates')
export class TemplatesController {
    constructor(private readonly templates: TemplatesService) { }

    @Get()
    async list(@Query('orgId') orgId?: string) {
        return this.templates.list(orgId);
    }

    @Get('default')
    async getDefault() {
        return this.templates.getDefault();
    }

    @Get(':id')
    async get(@Param('id') id: string) {
        return this.templates.get(id);
    }

    @Post()
    async create(@Body() dto: CreateTemplateDto) {
        return this.templates.create(dto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
        return this.templates.update(id, dto);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.templates.delete(id);
    }

    @Post(':id/default')
    async setDefault(@Param('id') id: string) {
        return this.templates.setDefault(id);
    }

    @Post('seed')
    async seedDefaults() {
        return this.templates.seedDefaults();
    }
}
