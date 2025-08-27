import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { LayoutService } from './layout.service';

class UpdateLayoutDto {
    sectionOrder?: string[];
    columns?: number;
    projectHighlights?: boolean;
    headerStyle?: 'centered' | 'left' | 'split';
    fontFamily?: string;
    fontSize?: number;
    lineSpacing?: number;
    margins?: { top: number; right: number; bottom: number; left: number };
    atsSafe?: boolean;
}

class ApplyTemplateDto {
    templateLayout: {
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

@Controller('layout')
export class LayoutController {
    constructor(private readonly layout: LayoutService) { }

    @Get(':variantId')
    async get(@Param('variantId') variantId: string) {
        return this.layout.get(variantId);
    }

    @Patch(':variantId')
    async update(@Param('variantId') variantId: string, @Body() dto: UpdateLayoutDto) {
        return this.layout.update(variantId, dto);
    }

    @Post(':variantId/section-order')
    async updateSectionOrder(@Param('variantId') variantId: string, @Body() dto: { sectionOrder: string[] }) {
        return this.layout.updateSectionOrder(variantId, dto.sectionOrder);
    }

    @Post(':variantId/columns')
    async updateColumns(@Param('variantId') variantId: string, @Body() dto: { columns: number }) {
        return this.layout.updateColumns(variantId, dto.columns);
    }

    @Post(':variantId/project-highlights')
    async updateProjectHighlights(@Param('variantId') variantId: string, @Body() dto: { enabled: boolean }) {
        return this.layout.updateProjectHighlights(variantId, dto.enabled);
    }

    @Post(':variantId/header-style')
    async updateHeaderStyle(@Param('variantId') variantId: string, @Body() dto: { headerStyle: 'centered' | 'left' | 'split' }) {
        return this.layout.updateHeaderStyle(variantId, dto.headerStyle);
    }

    @Post(':variantId/font')
    async updateFont(
        @Param('variantId') variantId: string,
        @Body() dto: { fontFamily: string; fontSize: number; lineSpacing: number }
    ) {
        return this.layout.updateFont(variantId, dto.fontFamily, dto.fontSize, dto.lineSpacing);
    }

    @Post(':variantId/margins')
    async updateMargins(
        @Param('variantId') variantId: string,
        @Body() dto: { margins: { top: number; right: number; bottom: number; left: number } }
    ) {
        return this.layout.updateMargins(variantId, dto.margins);
    }

    @Post(':variantId/ats-safe')
    async toggleAtsSafe(@Param('variantId') variantId: string, @Body() dto: { atsSafe: boolean }) {
        return this.layout.toggleAtsSafe(variantId, dto.atsSafe);
    }

    @Post(':variantId/apply-template')
    async applyTemplate(@Param('variantId') variantId: string, @Body() dto: ApplyTemplateDto) {
        return this.layout.applyTemplate(variantId, dto.templateLayout);
    }
}
