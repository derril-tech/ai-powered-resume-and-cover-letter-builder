import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComplianceSettingEntity } from '../entities/compliance_setting.entity';

@Injectable()
export class ComplianceService {
    constructor(
        @InjectRepository(ComplianceSettingEntity)
        private readonly repo: Repository<ComplianceSettingEntity>,
    ) { }

    async get(targetType: 'resume' | 'variant', targetId: string) {
        return this.repo.findOne({ where: { targetType, targetId } });
    }

    async set(targetType: 'resume' | 'variant', targetId: string, enabled: boolean, protectedFields?: string[]) {
        let cfg = await this.get(targetType, targetId);
        if (!cfg) cfg = this.repo.create({ targetType, targetId });
        cfg.enabled = enabled;
        cfg.protectedFields = protectedFields ?? [];
        return this.repo.save(cfg);
    }

    enforceEdit(targetType: 'resume' | 'variant', targetId: string, payload: Record<string, any>, approved: boolean) {
        // If compliance disabled -> allow
        // If enabled and not approved, reject edits touching protectedFields
        return this.get(targetType, targetId).then(cfg => {
            if (!cfg || !cfg.enabled) return { allowed: true };
            if (approved) return { allowed: true };
            const protectedPaths = new Set(cfg.protectedFields ?? []);
            const touches = this._payloadTouches(payload, protectedPaths);
            if (touches.length) throw new BadRequestException(`Edit touches protected fields: ${touches.join(', ')}`);
            return { allowed: true };
        });
    }

    private _payloadTouches(payload: Record<string, any>, protectedPaths: Set<string>): string[] {
        const touched: string[] = [];
        const walk = (obj: any, base: string) => {
            if (obj && typeof obj === 'object') {
                for (const k of Object.keys(obj)) {
                    const path = base ? `${base}.${k}` : k;
                    if (protectedPaths.has(path)) touched.push(path);
                    walk(obj[k], path);
                }
            }
        };
        walk(payload, '');
        return touched;
    }
}


