import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('websocket_connections')
export class WebSocketConnectionEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    orgId!: string;

    @Column({ type: 'uuid' })
    @Index()
    userId!: string;

    @Column({ type: 'varchar', length: 64 })
    connectionId!: string;

    @Column({ type: 'varchar', length: 32 })
    status!: 'connected' | 'disconnected' | 'away';

    @Column({ type: 'jsonb', nullable: true })
    metadata?: {
        userAgent?: string;
        ipAddress?: string;
        lastActivity?: Date;
        currentPage?: string;
        currentProject?: string;
        currentVariant?: string;
    };

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    connectedAt!: Date;

    @Column({ type: 'timestamp', nullable: true })
    disconnectedAt?: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}
