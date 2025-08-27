import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LockEntity } from '../entities/lock.entity';

export interface AcquireLockDto {
    ownerId: string;
    targetType: 'resume' | 'variant' | 'cover_letter';
    targetId: string;
    section?: string;
    ttlSeconds?: number;
}

@Injectable()
export class LocksService {
    constructor(
        @InjectRepository(LockEntity)
        private readonly repo: Repository<LockEntity>,
    ) { }

    async acquire(dto: AcquireLockDto) {
        const existing = await this.repo.findOne({ where: { targetType: dto.targetType, targetId: dto.targetId, section: dto.section ?? null } as any });
        if (existing) throw new BadRequestException('Lock already held');
        const expiresAt = dto.ttlSeconds ? new Date(Date.now() + dto.ttlSeconds * 1000) : null;
        const lock = this.repo.create({ ...dto, expiresAt });
        return this.repo.save(lock);
    }

    async release(id: string, ownerId: string) {
        const lock = await this.repo.findOne({ where: { id } });
        if (!lock || lock.ownerId !== ownerId) throw new BadRequestException('Cannot release lock');
        await this.repo.delete({ id });
        return { released: true };
    }

    async list(targetType: string, targetId: string) {
        return this.repo.find({ where: { targetType: targetType as any, targetId } });
    }
}


