import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLogEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    orgId!: string;

    @Column({ type: 'uuid' })
    @Index()
    userId!: string;

    @Column({ type: 'varchar', length: 64 })
    action!: string;

    @Column({ type: 'varchar', length: 32 })
    resourceType!: 'resume' | 'variant' | 'job' | 'project' | 'user' | 'org' | 'comment' | 'export' | 'integration';

    @Column({ type: 'uuid', nullable: true })
    @Index()
    resourceId?: string | null;

    @Column({ type: 'jsonb', nullable: true })
    oldValues?: any;

    @Column({ type: 'jsonb', nullable: true })
    newValues?: any;

    @Column({ type: 'jsonb', nullable: true })
    metadata?: {
        ipAddress?: string;
        userAgent?: string;
        sessionId?: string;
        requestId?: string;
        duration?: number;
        error?: string;
        tags?: string[];
    };

    @Column({ type: 'varchar', length: 32, default: 'success' })
    status!: 'success' | 'failure' | 'pending';

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;
}
