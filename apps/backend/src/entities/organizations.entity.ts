import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { Memberships } from './memberships.entity';
import { Projects } from './projects.entity';
import { Resumes } from './resumes.entity';
import { Assets } from './assets.entity';
import { AuditLog } from './audit-log.entity';

@Entity('organizations')
export class Organizations {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    slug: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    website: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    logoUrl: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @OneToMany(() => Memberships, (membership) => membership.organization)
    memberships: Memberships[];

    @OneToMany(() => Projects, (project) => project.organization)
    projects: Projects[];

    @OneToMany(() => Resumes, (resume) => resume.organization)
    resumes: Resumes[];

    @OneToMany(() => Assets, (asset) => asset.organization)
    assets: Assets[];

    @OneToMany(() => AuditLog, (auditLog) => auditLog.organization)
    auditLogs: AuditLog[];
}
