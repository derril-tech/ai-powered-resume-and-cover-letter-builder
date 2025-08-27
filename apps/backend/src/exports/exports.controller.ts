import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ExportsService } from './exports.service';

class CreateExportDto {
    exportId!: string;
    format!: 'docx' | 'pdf' | 'md';
    filename!: string;
    content!: Record<string, any>;
}

@Controller('exports')
export class ExportsController {
    constructor(private readonly exportsService: ExportsService) { }

    @Post()
    async create(@Body() dto: CreateExportDto) {
        return this.exportsService.requestExport(dto);
    }

    @Get(':id')
    async get(@Param('id') id: string) {
        return this.exportsService.getExport(id);
    }
}


