import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
} from 'typeorm';
import { Users } from './users.entity';
import { Organizations } from './organizations.entity';
import { UserRole } from '../rbac/role.service';

@Entity('memberships')
@Unique(['userId', 'organizationId'])
export class Memberships {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    userId: string;

    @Column({ type: 'uuid' })
    organizationId: string;

    @Column({
        type: 'enum',
        enum: ['owner', 'admin', 'editor', 'viewer'],
        default: 'viewer',
    })
    role: UserRole;

    @Column({ type: 'timestamp', nullable: true })
    invitedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    joinedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Users, (user) => user.memberships, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'userId' })
    user: Users;

    @ManyToOne(() => Organizations, (organization) => organization.memberships, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'organizationId' })
    organization: Organizations;
}
