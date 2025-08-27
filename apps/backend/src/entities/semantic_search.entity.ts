import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('semantic_search')
export class SemanticSearchEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    orgId!: string;

    @Column({ type: 'uuid' })
    @Index()
    userId!: string;

    @Column({ type: 'varchar', length: 32 })
    type!: 'resume' | 'job' | 'skill' | 'company';

    @Column({ type: 'uuid', nullable: true })
    @Index()
    documentId?: string | null;

    @Column({ type: 'varchar', length: 255 })
    title!: string;

    @Column({ type: 'text' })
    content!: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata?: {
        skills?: string[];
        experience?: string[];
        education?: string[];
        location?: string;
        industry?: string;
        level?: string;
        salary?: number;
        remote?: boolean;
        keywords?: string[];
    };

    @Column({ type: 'vector', dimension: 1536, nullable: true })
    embedding?: number[];

    @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
    similarity?: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}
