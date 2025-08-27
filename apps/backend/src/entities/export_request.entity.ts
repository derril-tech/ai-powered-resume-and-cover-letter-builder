import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('export_requests')
export class ExportRequestEntity {
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

    @Column({ type: 'varchar', length: 32 })
    format!: 'pdf' | 'docx' | 'markdown' | 'google_docs' | 'email';

    @Column({ type: 'varchar', length: 64 })
    name!: string;

    @Column({ type: 'jsonb' })
    config!: {
        templateId?: string;
        includeCoverLetter?: boolean;
        emailTo?: string;
        googleDocsTitle?: string;
        watermark?: boolean;
        password?: string;
        quality?: 'standard' | 'high' | 'print';
    };

    @Column({ type: 'varchar', length: 32, default: 'pending' })
    status!: 'pending' | 'processing' | 'completed' | 'failed';

    @Column({ type: 'jsonb', nullable: true })
    result?: {
        fileUrl?: string;
        fileSize?: number;
        googleDocsUrl?: string;
        emailSent?: boolean;
        errorMessage?: string;
    };

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', nullable: true })
    completedAt?: Date;
}
