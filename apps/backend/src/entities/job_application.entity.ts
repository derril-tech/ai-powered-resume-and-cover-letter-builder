import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('job_applications')
export class JobApplicationEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    orgId!: string;

    @Column({ type: 'uuid' })
    @Index()
    userId!: string;

    @Column({ type: 'uuid', nullable: true })
    @Index()
    jobId?: string | null;

    @Column({ type: 'varchar', length: 128 })
    companyName!: string;

    @Column({ type: 'varchar', length: 128 })
    position!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    jobUrl?: string | null;

    @Column({ type: 'varchar', length: 32, default: 'applied' })
    status!: 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn';

    @Column({ type: 'varchar', length: 32, nullable: true })
    priority?: 'low' | 'medium' | 'high' | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    salary?: number | null;

    @Column({ type: 'varchar', length: 32, nullable: true })
    location?: string | null;

    @Column({ type: 'boolean', default: false })
    isRemote!: boolean;

    @Column({ type: 'varchar', length: 32, nullable: true })
    applicationMethod?: 'linkedin' | 'company_website' | 'indeed' | 'glassdoor' | 'referral' | 'other' | null;

    @Column({ type: 'timestamp', nullable: true })
    appliedAt?: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    interviewDate?: Date | null;

    @Column({ type: 'text', nullable: true })
    notes?: string | null;

    @Column({ type: 'jsonb', nullable: true })
    contacts?: {
        name: string;
        email: string;
        phone?: string;
        role?: string;
        notes?: string;
    }[] | null;

    @Column({ type: 'jsonb', nullable: true })
    followUps?: {
        id: string;
        type: 'email' | 'call' | 'linkedin' | 'other';
        date: Date;
        description: string;
        completed: boolean;
    }[] | null;

    @Column({ type: 'jsonb', nullable: true })
    documents?: {
        resumeId: string;
        coverLetterId?: string;
        otherDocuments?: string[];
    } | null;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}
