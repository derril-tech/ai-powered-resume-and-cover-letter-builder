import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { VariantsService } from './variants.service';

class CreateDto {
    resumeId!: string;
    name!: string;
    content?: Record<string, any>;
}

class UpdateContentDto {
    content!: Record<string, any>;
}

@Controller('variants')
export class VariantsController {
    constructor(private readonly variants: VariantsService) { }

    @Post()
    async create(@Body() dto: CreateDto) {
        return this.variants.create(dto);
    }

    @Get('resume/:resumeId')
    async list(@Param('resumeId') resumeId: string) {
        return this.variants.list(resumeId);
    }

    @Get(':id')
    async get(@Param('id') id: string) {
        return this.variants.get(id);
    }

    @Patch(':id/content')
    async updateContent(@Param('id') id: string, @Body() dto: UpdateContentDto) {
        return this.variants.updateContent(id, dto.content);
    }

    @Patch(':id/optimized')
    async markOptimized(@Param('id') id: string) {
        return this.variants.markOptimized(id);
    }

    @Patch(':id/approve')
    async approve(@Param('id') id: string) {
        return this.variants.approve(id);
    }
}


