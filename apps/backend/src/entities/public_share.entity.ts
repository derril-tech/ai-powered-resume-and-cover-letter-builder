# Created automatically by Cursor AI(2024 - 12 - 19)

import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('public_shares')
export class PublicShareEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    orgId!: string;

    @Column({ type: 'uuid' })
    @Index()
    createdBy!: string;

    @Column({ type: 'varchar', length: 64 })
    shareType!: 'resume' | 'cover_letter' | 'job_description';

    @Column({ type: 'uuid' })
    @Index()
    resourceId!: string; // ID of the resume, cover letter, or job description

    @Column({ type: 'varchar', length: 255, unique: true })
    @Index()
    shareToken!: string; // Unique token for the share link

    @Column({ type: 'varchar', length: 255, nullable: true })
    customSlug?: string; // Optional custom slug for the URL

    @Column({ type: 'timestamp', nullable: true })
    expiresAt?: Date; // TTL for the share link

    @Column({ type: 'boolean', default: false })
    isActive!: boolean;

    @Column({ type: 'boolean', default: true })
    requirePassword!: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true })
    password?: string; // Hashed password if required

    @Column({ type: 'jsonb' })
    watermarkSettings!: {
        enabled: boolean;
        text?: string; // Custom watermark text
        position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
        opacity: number; // 0-1
        fontSize: number;
        color: string;
        rotation: number; // degrees
    };

    @Column({ type: 'jsonb' })
    accessSettings!: {
        allowDownload: boolean;
        allowPrint: boolean;
        allowCopy: boolean;
        showAnalytics: boolean;
        requireEmail: boolean;
        maxViews?: number;
    };

    @Column({ type: 'jsonb', nullable: true })
    analytics?: {
        totalViews: number;
        uniqueViews: number;
        downloads: number;
        prints: number;
        lastViewedAt?: Date;
        viewerEmails?: string[];
    };

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}
