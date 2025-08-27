import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VariantEntity } from '../entities/variant.entity';

export interface CreateVariantDto {
    resumeId: string;
    name: string;
    content?: Record<string, any>;
}

@Injectable()
export class VariantsService {
    constructor(
        @InjectRepository(VariantEntity)
        private readonly repo: Repository<VariantEntity>,
    ) { }

    async create(dto: CreateVariantDto) {
        const v = this.repo.create({ ...dto, status: 'draft' });
        return this.repo.save(v);
    }

    async list(resumeId: string) {
        return this.repo.find({ where: { resumeId }, order: { createdAt: 'DESC' } });
    }

    async get(id: string) {
        const v = await this.repo.findOne({ where: { id } });
        if (!v) throw new NotFoundException('Variant not found');
        return v;
    }

    async updateContent(id: string, content: Record<string, any>) {
        const v = await this.get(id);
        v.content = content;
        return this.repo.save(v);
    }

    async markOptimized(id: string) {
        const v = await this.get(id);
        v.status = 'optimized';
        return this.repo.save(v);
    }

    async approve(id: string) {
        const v = await this.get(id);
        v.status = 'approved';
        return this.repo.save(v);
    }
}


