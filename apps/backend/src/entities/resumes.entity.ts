import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Users } from './users.entity';
import { Organizations } from './organizations.entity';

@Entity('resumes')
export class Resumes {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    userId: string;

    @Column({ type: 'uuid' })
    organizationId: string;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Users, (user) => user.resumes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: Users;

    @ManyToOne(() => Organizations, (organization) => organization.resumes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organizationId' })
    organization: Organizations;
}
