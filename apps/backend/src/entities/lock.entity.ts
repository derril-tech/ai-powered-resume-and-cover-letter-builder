import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('locks')
export class LockEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 32 })
    targetType!: 'resume' | 'variant' | 'cover_letter';

    @Column({ type: 'uuid' })
    @Index()
    targetId!: string;

    @Column({ type: 'uuid' })
    @Index()
    ownerId!: string;

    @Column({ type: 'varchar', length: 512, nullable: true })
    section?: string | null; // optional subsection

    @CreateDateColumn({ type: 'timestamptz' })
    acquiredAt!: Date;

    @Column({ type: 'timestamptz', nullable: true })
    expiresAt?: Date | null;
}


