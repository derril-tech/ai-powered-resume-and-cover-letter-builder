import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('dead_letter_queue')
export class DeadLetterQueueEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    orgId!: string;

    @Column({ type: 'varchar', length: 64 })
    queueName!: string;

    @Column({ type: 'varchar', length: 64 })
    messageType!: string;

    @Column({ type: 'jsonb' })
    originalMessage!: any;

    @Column({ type: 'jsonb' })
    error!: {
        message: string;
        stack?: string;
        code?: string;
        details?: any;
    };

    @Column({ type: 'int', default: 0 })
    retryCount!: number;

    @Column({ type: 'int', default: 3 })
    maxRetries!: number;

    @Column({ type: 'timestamp', nullable: true })
    nextRetryAt?: Date | null;

    @Column({ type: 'varchar', length: 32, default: 'failed' })
    status!: 'failed' | 'retrying' | 'processed' | 'abandoned';

    @Column({ type: 'jsonb', nullable: true })
    processingHistory?: {
        attempt: number;
        timestamp: Date;
        error?: string;
        result?: any;
    }[];

    @Column({ type: 'jsonb', nullable: true })
    metadata?: {
        sourceWorker?: string;
        targetWorker?: string;
        priority?: 'low' | 'normal' | 'high' | 'urgent';
        tags?: string[];
        correlationId?: string;
        traceId?: string;
    };

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;

    @Column({ type: 'timestamp', nullable: true })
    processedAt?: Date | null;
}
