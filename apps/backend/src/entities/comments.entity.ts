import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Users } from './users.entity';

@Entity('comments')
export class Comments {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    authorId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Users, (user) => user.comments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'authorId' })
    author: Users;
}
