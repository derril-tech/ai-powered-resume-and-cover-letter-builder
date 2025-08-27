import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VariantVersionEntity } from '../entities/variant_version.entity';

@Injectable()
export class VersionsService {
    constructor(
        @InjectRepository(VariantVersionEntity)
        private readonly repo: Repository<VariantVersionEntity>,
    ) { }

    async snapshot(variantId: string, snapshot: Record<string, any>, label?: string) {
        const v = this.repo.create({ variantId, snapshot, label });
        return this.repo.save(v);
    }

    async list(variantId: string) {
        return this.repo.find({ where: { variantId }, order: { createdAt: 'DESC' } });
    }

    async get(id: string) {
        return this.repo.findOne({ where: { id } });
    }
}


