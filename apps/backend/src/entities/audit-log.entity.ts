import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Users } from './users.entity';
import { Organizations } from './organizations.entity';

@Entity('audit_log')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', nullable: true })
    organizationId: string;

    @Column({ type: 'uuid', nullable: true })
    userId: string;

    @Column({ type: 'varchar', length: 100 })
    action: string;

    @Column({ type: 'varchar', length: 50 })
    resourceType: string;

    @Column({ type: 'uuid', nullable: true })
    resourceId: string;

    @Column({ type: 'jsonb', nullable: true })
    oldValues: any;

    @Column({ type: 'jsonb', nullable: true })
    newValues: any;

    @Column({ type: 'inet', nullable: true })
    ipAddress: string;

    @Column({ type: 'text', nullable: true })
    userAgent: string;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Users, (user) => user.memberships, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'userId' })
    user: Users;

    @ManyToOne(() => Organizations, (organization) => organization.auditLogs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organizationId' })
    organization: Organizations;
}
