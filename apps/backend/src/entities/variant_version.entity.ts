import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('variant_versions')
export class VariantVersionEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    variantId!: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    label?: string | null;

    @Column({ type: 'jsonb' })
    snapshot!: Record<string, any>;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;
}


