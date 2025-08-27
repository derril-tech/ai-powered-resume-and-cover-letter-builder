import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Projects } from './projects.entity';

@Entity('jobs')
export class Jobs {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    projectId: string;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'varchar', length: 255 })
    company: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'uuid' })
    createdBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Projects, (project) => project.jobs, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'projectId' })
    project: Projects;
}
