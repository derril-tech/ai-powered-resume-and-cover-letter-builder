import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Users } from './users.entity';

@Entity('cover_letters')
export class CoverLetters {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    createdBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Users, (user) => user.coverLetters, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'createdBy' })
    createdByUser: Users;
}
