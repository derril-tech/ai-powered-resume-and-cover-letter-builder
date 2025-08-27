import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('notifications')
export class NotificationEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    orgId!: string;

    @Column({ type: 'uuid' })
    @Index()
    userId!: string;

    @Column({ type: 'varchar', length: 64 })
    type!: 'info' | 'success' | 'warning' | 'error' | 'reminder' | 'update';

    @Column({ type: 'varchar', length: 128 })
    title!: string;

    @Column({ type: 'text' })
    message!: string;

    @Column({ type: 'jsonb', nullable: true })
    data?: {
        actionUrl?: string;
        actionText?: string;
        icon?: string;
        priority?: 'low' | 'medium' | 'high';
        category?: string;
        tags?: string[];
    };

    @Column({ type: 'boolean', default: false })
    isRead!: boolean;

    @Column({ type: 'timestamp', nullable: true })
    readAt?: Date | null;

    @Column({ type: 'boolean', default: false })
    isArchived!: boolean;

    @Column({ type: 'timestamp', nullable: true })
    archivedAt?: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    expiresAt?: Date | null;

    @Column({ type: 'jsonb', nullable: true })
    deliveryChannels?: {
        email?: boolean;
        push?: boolean;
        inApp?: boolean;
        sms?: boolean;
    };

    @Column({ type: 'jsonb', nullable: true })
    deliveryStatus?: {
        email?: 'pending' | 'sent' | 'failed';
        push?: 'pending' | 'sent' | 'failed';
        inApp?: 'pending' | 'sent' | 'failed';
        sms?: 'pending' | 'sent' | 'failed';
    };

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}
