import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('calendar_events')
export class CalendarEventEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    orgId!: string;

    @Column({ type: 'uuid' })
    @Index()
    userId!: string;

    @Column({ type: 'uuid', nullable: true })
    @Index()
    jobId?: string | null;

    @Column({ type: 'varchar', length: 128 })
    title!: string;

    @Column({ type: 'text', nullable: true })
    description?: string | null;

    @Column({ type: 'timestamp' })
    startTime!: Date;

    @Column({ type: 'timestamp' })
    endTime!: Date;

    @Column({ type: 'varchar', length: 32 })
    type!: 'interview' | 'prep' | 'follow_up' | 'reminder';

    @Column({ type: 'jsonb', nullable: true })
    location?: {
        address?: string;
        room?: string;
        virtual?: boolean;
        meetingUrl?: string;
    } | null;

    @Column({ type: 'jsonb', nullable: true })
    attendees?: {
        name: string;
        email: string;
        role?: string;
    }[] | null;

    @Column({ type: 'jsonb', nullable: true })
    reminders?: {
        type: 'email' | 'push' | 'sms';
        minutesBefore: number;
    }[] | null;

    @Column({ type: 'boolean', default: false })
    isRecurring!: boolean;

    @Column({ type: 'jsonb', nullable: true })
    recurrence?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        interval: number;
        endDate?: Date;
        daysOfWeek?: number[];
    } | null;

    @Column({ type: 'varchar', length: 32, default: 'active' })
    status!: 'active' | 'cancelled' | 'completed';

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;
}
