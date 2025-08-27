import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('compliance_settings')
export class ComplianceSettingEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 32 })
    targetType!: 'resume' | 'variant';

    @Column({ type: 'uuid' })
    @Index()
    targetId!: string;

    @Column({ type: 'boolean', default: false })
    enabled!: boolean;

    @Column({ type: 'jsonb', nullable: true })
    protectedFields?: string[] | null; // paths that require approval
}


