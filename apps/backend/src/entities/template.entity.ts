import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('templates')
export class TemplateEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 64 })
    name!: string;

    @Column({ type: 'varchar', length: 32 })
    style!: 'modern' | 'classic' | 'minimalist';

    @Column({ type: 'boolean', default: true })
    atsSafe!: boolean;

    @Column({ type: 'jsonb' })
    layout!: {
        sections: string[];
        columns: number;
        projectHighlights: boolean;
        headerStyle: 'centered' | 'left' | 'split';
        fontFamily: string;
        fontSize: number;
        lineSpacing: number;
        margins: { top: number; right: number; bottom: number; left: number };
    };

    @Column({ type: 'boolean', default: false })
    isDefault!: boolean;

    @Column({ type: 'uuid', nullable: true })
    @Index()
    orgId?: string | null;
}
