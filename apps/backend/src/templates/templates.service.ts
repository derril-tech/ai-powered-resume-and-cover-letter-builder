import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemplateEntity } from '../entities/template.entity';

@Injectable()
export class TemplatesService {
    constructor(
        @InjectRepository(TemplateEntity)
        private readonly repo: Repository<TemplateEntity>,
    ) { }

    async create(data: Partial<TemplateEntity>) {
        const template = this.repo.create(data);
        return this.repo.save(template);
    }

    async list(orgId?: string) {
        const query = this.repo.createQueryBuilder('t')
            .where('t.orgId IS NULL OR t.orgId = :orgId', { orgId })
            .orderBy('t.isDefault', 'DESC')
            .addOrderBy('t.name', 'ASC');
        return query.getMany();
    }

    async get(id: string) {
        return this.repo.findOne({ where: { id } });
    }

    async update(id: string, data: Partial<TemplateEntity>) {
        await this.repo.update(id, data);
        return this.get(id);
    }

    async delete(id: string) {
        const template = await this.get(id);
        if (template?.isDefault) throw new Error('Cannot delete default template');
        return this.repo.delete(id);
    }

    async getDefault() {
        return this.repo.findOne({ where: { isDefault: true } });
    }

    async setDefault(id: string) {
        // Clear existing default
        await this.repo.update({ isDefault: true }, { isDefault: false });
        // Set new default
        await this.repo.update(id, { isDefault: true });
        return this.get(id);
    }

    async seedDefaults() {
        const defaults = [
            {
                name: 'Modern Professional',
                style: 'modern',
                atsSafe: true,
                isDefault: true,
                layout: {
                    sections: ['contact', 'summary', 'experience', 'education', 'skills'],
                    columns: 1,
                    projectHighlights: true,
                    headerStyle: 'centered',
                    fontFamily: 'Arial',
                    fontSize: 11,
                    lineSpacing: 1.15,
                    margins: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 }
                }
            },
            {
                name: 'Classic Executive',
                style: 'classic',
                atsSafe: true,
                layout: {
                    sections: ['contact', 'summary', 'experience', 'education', 'skills', 'certifications'],
                    columns: 1,
                    projectHighlights: false,
                    headerStyle: 'left',
                    fontFamily: 'Times New Roman',
                    fontSize: 12,
                    lineSpacing: 1.2,
                    margins: { top: 0.75, right: 0.75, bottom: 0.75, left: 0.75 }
                }
            },
            {
                name: 'Minimalist Clean',
                style: 'minimalist',
                atsSafe: true,
                layout: {
                    sections: ['contact', 'summary', 'experience', 'education', 'skills'],
                    columns: 1,
                    projectHighlights: false,
                    headerStyle: 'left',
                    fontFamily: 'Calibri',
                    fontSize: 10,
                    lineSpacing: 1.1,
                    margins: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 }
                }
            }
        ];

        for (const defaultTemplate of defaults) {
            const exists = await this.repo.findOne({ where: { name: defaultTemplate.name } });
            if (!exists) {
                await this.create(defaultTemplate);
            }
        }
    }
}
