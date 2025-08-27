# Created automatically by Cursor AI(2024 - 12 - 19)

import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('plan_enforcement')
export class PlanEnforcementEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    orgId!: string;

    @Column({ type: 'varchar', length: 32 })
    planType!: 'free' | 'starter' | 'professional' | 'enterprise';

    @Column({ type: 'jsonb' })
    limits!: {
        seats: number;
        exports: { daily: number; monthly: number; yearly: number };
        optimizations: { daily: number; monthly: number; yearly: number };
        cover_letters: { daily: number; monthly: number; yearly: number };
        api_calls: { daily: number; monthly: number; yearly: number };
        storage_gb: number;
        features: string[];
    };

    @Column({ type: 'jsonb' })
    overageRates!: {
        exports: number;
        optimizations: number;
        cover_letters: number;
        api_calls: number;
        storage_gb: number;
        seats: number;
    };

    @Column({ type: 'boolean', default: false })
    enforceSeatLimit!: boolean;

    @Column({ type: 'boolean', default: false })
    enforceUsageLimit!: boolean;

    @Column({ type: 'boolean', default: false })
    allowOverage!: boolean;

    @Column({ type: 'timestamp', nullable: true })
    planExpiresAt?: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}
