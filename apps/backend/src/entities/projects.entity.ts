import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { Organizations } from './organizations.entity';
import { Jobs } from './jobs.entity';

@Entity('projects')
export class Projects {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organizationId: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'uuid' })
    createdBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Organizations, (organization) => organization.projects, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'organizationId' })
    organization: Organizations;

    @OneToMany(() => Jobs, (job) => job.project)
    jobs: Jobs[];
}
