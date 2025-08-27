import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('soft_locks')
export class SoftLockEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    orgId!: string;

    @Column({ type: 'uuid' })
    @Index()
    userId!: string;

    @Column({ type: 'uuid' })
    @Index()
    variantId!: string;

    @Column({ type: 'varchar', length: 64 })
    lockType!: 'edit' | 'review' | 'approval' | 'export';

    @Column({ type: 'jsonb', nullable: true })
    scope?: {
        sections?: string[];
        fields?: string[];
        readOnly?: boolean;
    };

    @Column({ type: 'varchar', length: 255, nullable: true })
    reason?: string | null;

    @Column({ type: 'timestamp' })
    acquiredAt!: Date;

    @Column({ type: 'timestamp' })
    expiresAt!: Date;

    @Column({ type: 'timestamp', nullable: true })
    releasedAt?: Date | null;

    @Column({ type: 'uuid', nullable: true })
    releasedBy?: string | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata?: {
        userAgent?: string;
        ipAddress?: string;
        sessionId?: string;
        activity?: {
            lastAction?: string;
            lastActionAt?: Date;
            actionCount?: number;
        };
    };

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}
