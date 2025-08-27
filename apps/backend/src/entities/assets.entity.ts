import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Users } from './users.entity';
import { Organizations } from './organizations.entity';

@Entity('assets')
export class Assets {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organizationId: string;

    @Column({ type: 'uuid' })
    createdBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Users, (user) => user.assets, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'createdBy' })
    createdByUser: Users;

    @ManyToOne(() => Organizations, (organization) => organization.assets, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organizationId' })
    organization: Organizations;
}
