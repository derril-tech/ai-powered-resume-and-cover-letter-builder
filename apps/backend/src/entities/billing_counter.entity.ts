import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('billing_counters')
export class BillingCounterEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    orgId!: string;

    @Column({ type: 'varchar', length: 64 })
    @Index()
    counterType!: 'exports' | 'optimizations' | 'cover_letters' | 'api_calls' | 'storage_gb' | 'users';

    @Column({ type: 'varchar', length: 32 })
    @Index()
    period!: 'daily' | 'monthly' | 'yearly';

    @Column({ type: 'date' })
    @Index()
    periodStart!: Date;

    @Column({ type: 'date' })
    @Index()
    periodEnd!: Date;

    @Column({ type: 'bigint', default: 0 })
    currentCount!: number;

    @Column({ type: 'bigint', default: 0 })
    limit!: number;

    @Column({ type: 'jsonb', nullable: true })
    breakdown?: {
        exports?: {
            pdf?: number;
            docx?: number;
            markdown?: number;
            email?: number;
        };
        optimizations?: {
            basic?: number;
            advanced?: number;
            ats_optimized?: number;
        };
        cover_letters?: {
            generated?: number;
            exported?: number;
        };
        api_calls?: {
            resume_parse?: number;
            jd_parse?: number;
            optimize?: number;
            export?: number;
        };
        storage?: {
            resumes?: number;
            exports?: number;
            attachments?: number;
        };
    };

    @Column({ type: 'jsonb', nullable: true })
    metadata?: {
        lastResetAt?: Date;
        lastUpdatedAt?: Date;
        resetFrequency?: string;
        overageCharges?: number;
        overageThreshold?: number;
    };

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}
