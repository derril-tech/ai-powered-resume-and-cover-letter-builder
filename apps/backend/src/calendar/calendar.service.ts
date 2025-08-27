import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarEventEntity } from '../entities/calendar_event.entity';

@Injectable()
export class CalendarService {
    constructor(
        @InjectRepository(CalendarEventEntity)
        private readonly repo: Repository<CalendarEventEntity>,
    ) { }

    async create(data: Partial<CalendarEventEntity>) {
        const event = this.repo.create(data);
        return this.repo.save(event);
    }

    async list(orgId: string, userId: string, startDate?: Date, endDate?: Date) {
        const query = this.repo.createQueryBuilder('event')
            .where('event.orgId = :orgId', { orgId })
            .andWhere('event.userId = :userId', { userId })
            .andWhere('event.status = :status', { status: 'active' });

        if (startDate) {
            query.andWhere('event.startTime >= :startDate', { startDate });
        }

        if (endDate) {
            query.andWhere('event.endTime <= :endDate', { endDate });
        }

        return query.orderBy('event.startTime', 'ASC').getMany();
    }

    async get(id: string) {
        return this.repo.findOne({ where: { id } });
    }

    async update(id: string, data: Partial<CalendarEventEntity>) {
        await this.repo.update(id, data);
        return this.get(id);
    }

    async delete(id: string) {
        return this.repo.update(id, { status: 'cancelled' });
    }

    async createInterviewPrep(jobId: string, interviewDate: Date, userId: string, orgId: string) {
        const prepEvents = [
            {
                title: 'Research Company & Role',
                description: 'Research the company culture, recent news, and prepare questions about the role',
                startTime: new Date(interviewDate.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days before
                endTime: new Date(interviewDate.getTime() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour
                type: 'prep' as const,
                reminders: [{ type: 'email' as const, minutesBefore: 1440 }] // 24 hours
            },
            {
                title: 'Review Resume & Prepare STAR Stories',
                description: 'Review your resume and prepare specific examples using the STAR method',
                startTime: new Date(interviewDate.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day before
                endTime: new Date(interviewDate.getTime() - 1 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // 1.5 hours
                type: 'prep' as const,
                reminders: [{ type: 'email' as const, minutesBefore: 720 }] // 12 hours
            },
            {
                title: 'Prepare Interview Outfit & Materials',
                description: 'Prepare your interview outfit, portfolio, and any required materials',
                startTime: new Date(interviewDate.getTime() - 12 * 60 * 60 * 1000), // 12 hours before
                endTime: new Date(interviewDate.getTime() - 12 * 60 * 60 * 1000 + 30 * 60 * 1000), // 30 minutes
                type: 'prep' as const,
                reminders: [{ type: 'email' as const, minutesBefore: 60 }] // 1 hour
            },
            {
                title: 'Travel to Interview Location',
                description: 'Leave early to account for traffic and arrive 15 minutes early',
                startTime: new Date(interviewDate.getTime() - 45 * 60 * 1000), // 45 minutes before
                endTime: new Date(interviewDate.getTime() - 15 * 60 * 1000), // 15 minutes before
                type: 'prep' as const,
                reminders: [{ type: 'email' as const, minutesBefore: 30 }] // 30 minutes
            }
        ];

        const createdEvents = [];
        for (const eventData of prepEvents) {
            const event = await this.create({
                ...eventData,
                jobId,
                userId,
                orgId
            });
            createdEvents.push(event);
        }

        return createdEvents;
    }

    async createFollowUpReminder(jobId: string, interviewDate: Date, userId: string, orgId: string) {
        const followUpDate = new Date(interviewDate.getTime() + 24 * 60 * 60 * 1000); // 1 day after

        return this.create({
            title: 'Send Interview Follow-up',
            description: 'Send a thank you email to the interviewer and follow up on next steps',
            startTime: followUpDate,
            endTime: new Date(followUpDate.getTime() + 30 * 60 * 1000), // 30 minutes
            type: 'follow_up',
            jobId,
            userId,
            orgId,
            reminders: [{ type: 'email', minutesBefore: 60 }] // 1 hour
        });
    }

    async generateICS(events: CalendarEventEntity[]) {
        let icsContent = 'BEGIN:VCALENDAR\r\n';
        icsContent += 'VERSION:2.0\r\n';
        icsContent += 'PRODID:-//Resume Builder//Interview Prep Calendar//EN\r\n';
        icsContent += 'CALSCALE:GREGORIAN\r\n';
        icsContent += 'METHOD:PUBLISH\r\n';

        for (const event of events) {
            icsContent += 'BEGIN:VEVENT\r\n';
            icsContent += `UID:${event.id}@resumebuilder.com\r\n`;
            icsContent += `DTSTAMP:${this.formatDate(new Date())}\r\n`;
            icsContent += `DTSTART:${this.formatDate(event.startTime)}\r\n`;
            icsContent += `DTEND:${this.formatDate(event.endTime)}\r\n`;
            icsContent += `SUMMARY:${this.escapeText(event.title)}\r\n`;

            if (event.description) {
                icsContent += `DESCRIPTION:${this.escapeText(event.description)}\r\n`;
            }

            if (event.location?.address) {
                icsContent += `LOCATION:${this.escapeText(event.location.address)}\r\n`;
            }

            if (event.attendees) {
                for (const attendee of event.attendees) {
                    icsContent += `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${attendee.email}\r\n`;
                }
            }

            if (event.reminders) {
                for (const reminder of event.reminders) {
                    icsContent += 'BEGIN:VALARM\r\n';
                    icsContent += 'ACTION:DISPLAY\r\n';
                    icsContent += `TRIGGER:-PT${reminder.minutesBefore}M\r\n`;
                    icsContent += `DESCRIPTION:${this.escapeText(event.title)}\r\n`;
                    icsContent += 'END:VALARM\r\n';
                }
            }

            icsContent += 'END:VEVENT\r\n';
        }

        icsContent += 'END:VCALENDAR\r\n';
        return icsContent;
    }

    async exportToICS(userId: string, orgId: string, startDate?: Date, endDate?: Date) {
        const events = await this.list(orgId, userId, startDate, endDate);
        return this.generateICS(events);
    }

    private formatDate(date: Date): string {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }

    private escapeText(text: string): string {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');
    }

    async getUpcomingEvents(userId: string, orgId: string, days: number = 7) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days);

        return this.list(orgId, userId, startDate, endDate);
    }

    async getEventsByType(userId: string, orgId: string, type: string) {
        return this.repo.find({
            where: { orgId, userId, type, status: 'active' },
            order: { startTime: 'ASC' }
        });
    }

    async getEventsByJob(jobId: string, userId: string, orgId: string) {
        return this.repo.find({
            where: { jobId, userId, orgId, status: 'active' },
            order: { startTime: 'ASC' }
        });
    }
}
