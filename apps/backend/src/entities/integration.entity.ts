import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('integrations')
export class IntegrationEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    orgId!: string;

    @Column({ type: 'uuid' })
    @Index()
    userId!: string;

    @Column({ type: 'varchar', length: 32 })
    type!: 'linkedin' | 'json_resume' | 'google_drive' | 'dropbox';

    @Column({ type: 'varchar', length: 64 })
    name!: string;

    @Column({ type: 'jsonb' })
    config!: {
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: string;
        profileUrl?: string;
        filePath?: string;
        syncEnabled: boolean;
        lastSyncAt?: string;
    };

    @Column({ type: 'jsonb', nullable: true })
    metadata?: {
        profileData?: any;
        fileInfo?: any;
        syncStatus?: string;
        errorMessage?: string;
    };

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}
