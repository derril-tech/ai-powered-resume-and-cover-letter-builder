import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('comments')
export class CommentEntity {
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

    @Column({ type: 'uuid', nullable: true })
    @Index()
    parentId?: string | null;

    @Column({ type: 'varchar', length: 32 })
    type!: 'general' | 'suggestion' | 'review' | 'question' | 'feedback';

    @Column({ type: 'varchar', length: 255 })
    title!: string;

    @Column({ type: 'text' })
    body!: string;

    @Column({ type: 'jsonb', nullable: true })
    anchor?: {
        section: string;
        field?: string;
        startOffset?: number;
        endOffset?: number;
        text?: string;
        coordinates?: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    } | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata?: {
        tags?: string[];
        priority?: 'low' | 'medium' | 'high';
        status?: 'open' | 'resolved' | 'closed';
        assignee?: string;
        dueDate?: Date;
        attachments?: string[];
    };

    @Column({ type: 'boolean', default: false })
    isResolved!: boolean;

    @Column({ type: 'timestamp', nullable: true })
    resolvedAt?: Date | null;

    @Column({ type: 'uuid', nullable: true })
    resolvedBy?: string | null;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}
