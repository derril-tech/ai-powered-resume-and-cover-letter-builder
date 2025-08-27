import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Users } from './users.entity';

@Entity('exports')
export class Exports {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    createdBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Users, (user) => user.exports, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'createdBy' })
    createdByUser: Users;
}
