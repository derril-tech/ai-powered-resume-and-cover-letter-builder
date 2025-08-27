import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type VariantStatus = 'draft' | 'optimized' | 'approved';

@Entity('variants')
export class VariantEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    resumeId!: string;

    @Column({ type: 'varchar', length: 200 })
    name!: string;

    @Column({ type: 'jsonb', nullable: true })
    content?: Record<string, any>;

    @Column({ type: 'varchar', length: 20, default: 'draft' })
    status!: VariantStatus;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}


