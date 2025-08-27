import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { Memberships } from './memberships.entity';
import { Resumes } from './resumes.entity';
import { ResumeVariants } from './resume-variants.entity';
import { CoverLetters } from './cover-letters.entity';
import { Exports } from './exports.entity';
import { Assets } from './assets.entity';
import { Comments } from './comments.entity';

@Entity('users')
export class Users {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    email: string;

    @Column({ type: 'varchar', length: 255 })
    passwordHash: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    firstName: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    lastName: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    avatarUrl: string;

    @Column({ type: 'boolean', default: false })
    emailVerified: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @OneToMany(() => Memberships, (membership) => membership.user)
    memberships: Memberships[];

    @OneToMany(() => Resumes, (resume) => resume.user)
    resumes: Resumes[];

    @OneToMany(() => ResumeVariants, (variant) => variant.createdByUser)
    resumeVariants: ResumeVariants[];

    @OneToMany(() => CoverLetters, (coverLetter) => coverLetter.createdByUser)
    coverLetters: CoverLetters[];

    @OneToMany(() => Exports, (export_) => export_.createdByUser)
    exports: Exports[];

    @OneToMany(() => Assets, (asset) => asset.createdByUser)
    assets: Assets[];

    @OneToMany(() => Comments, (comment) => comment.author)
    comments: Comments[];
}
