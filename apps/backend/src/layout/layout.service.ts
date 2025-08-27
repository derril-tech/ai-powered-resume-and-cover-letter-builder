import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LayoutControlEntity } from '../entities/layout_control.entity';

@Injectable()
export class LayoutService {
    constructor(
        @InjectRepository(LayoutControlEntity)
        private readonly repo: Repository<LayoutControlEntity>,
    ) { }

    async get(variantId: string) {
        let layout = await this.repo.findOne({ where: { variantId } });
        if (!layout) {
            layout = this.repo.create({
                variantId,
                sectionOrder: ['contact', 'summary', 'experience', 'education', 'skills'],
                columns: 1,
                projectHighlights: false,
                headerStyle: 'left',
                fontFamily: 'Arial',
                fontSize: 11,
                lineSpacing: 1.15,
                margins: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 },
                atsSafe: true,
            });
            await this.repo.save(layout);
        }
        return layout;
    }

    async update(variantId: string, data: Partial<LayoutControlEntity>) {
        const layout = await this.get(variantId);
        Object.assign(layout, data);
        return this.repo.save(layout);
    }

    async updateSectionOrder(variantId: string, sectionOrder: string[]) {
        return this.update(variantId, { sectionOrder });
    }

    async updateColumns(variantId: string, columns: number) {
        if (columns < 1 || columns > 3) throw new Error('Columns must be between 1 and 3');
        return this.update(variantId, { columns });
    }

    async updateProjectHighlights(variantId: string, enabled: boolean) {
        return this.update(variantId, { projectHighlights: enabled });
    }

    async updateHeaderStyle(variantId: string, headerStyle: 'centered' | 'left' | 'split') {
        return this.update(variantId, { headerStyle });
    }

    async updateFont(variantId: string, fontFamily: string, fontSize: number, lineSpacing: number) {
        return this.update(variantId, { fontFamily, fontSize, lineSpacing });
    }

    async updateMargins(variantId: string, margins: { top: number; right: number; bottom: number; left: number }) {
        return this.update(variantId, { margins });
    }

    async toggleAtsSafe(variantId: string, atsSafe: boolean) {
        return this.update(variantId, { atsSafe });
    }

    async applyTemplate(variantId: string, templateLayout: any) {
        const layout = await this.get(variantId);
        Object.assign(layout, {
            sectionOrder: templateLayout.sections,
            columns: templateLayout.columns,
            projectHighlights: templateLayout.projectHighlights,
            headerStyle: templateLayout.headerStyle,
            fontFamily: templateLayout.fontFamily,
            fontSize: templateLayout.fontSize,
            lineSpacing: templateLayout.lineSpacing,
            margins: templateLayout.margins,
        });
        return this.repo.save(layout);
    }
}
