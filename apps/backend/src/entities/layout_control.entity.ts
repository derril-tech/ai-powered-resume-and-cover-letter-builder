import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('layout_controls')
export class LayoutControlEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    variantId!: string;

    @Column({ type: 'jsonb' })
    sectionOrder!: string[]; // ['contact', 'summary', 'experience', ...]

    @Column({ type: 'int', default: 1 })
    columns!: number;

    @Column({ type: 'boolean', default: false })
    projectHighlights!: boolean;

    @Column({ type: 'varchar', length: 32, default: 'left' })
    headerStyle!: 'centered' | 'left' | 'split';

    @Column({ type: 'varchar', length: 64, default: 'Arial' })
    fontFamily!: string;

    @Column({ type: 'int', default: 11 })
    fontSize!: number;

    @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.15 })
    lineSpacing!: number;

    @Column({ type: 'jsonb' })
    margins!: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };

    @Column({ type: 'boolean', default: true })
    atsSafe!: boolean;
}
