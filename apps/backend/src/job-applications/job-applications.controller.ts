import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { JobApplicationsService } from './job-applications.service';

class CreateJobApplicationDto {
    companyName!: string;
    position!: string;
    jobUrl?: string;
    status?: 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn';
    priority?: 'low' | 'medium' | 'high';
    salary?: number;
    location?: string;
    isRemote?: boolean;
    applicationMethod?: 'linkedin' | 'company_website' | 'indeed' | 'glassdoor' | 'referral' | 'other';
    appliedAt?: Date;
    interviewDate?: Date;
    notes?: string;
    documents?: {
        resumeId: string;
        coverLetterId?: string;
        otherDocuments?: string[];
    };
}

class UpdateJobApplicationDto {
    companyName?: string;
    position?: string;
    jobUrl?: string;
    status?: 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn';
    priority?: 'low' | 'medium' | 'high';
    salary?: number;
    location?: string;
    isRemote?: boolean;
    applicationMethod?: 'linkedin' | 'company_website' | 'indeed' | 'glassdoor' | 'referral' | 'other';
    appliedAt?: Date;
    interviewDate?: Date;
    notes?: string;
    documents?: {
        resumeId: string;
        coverLetterId?: string;
        otherDocuments?: string[];
    };
}

class AddContactDto {
    name!: string;
    email!: string;
    phone?: string;
    role?: string;
    notes?: string;
}

class UpdateContactDto {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    notes?: string;
}

class AddFollowUpDto {
    type!: 'email' | 'call' | 'linkedin' | 'other';
    date!: Date;
    description!: string;
}

class UpdateFollowUpDto {
    type?: 'email' | 'call' | 'linkedin' | 'other';
    date?: Date;
    description?: string;
    completed?: boolean;
}

@Controller('job-applications')
export class JobApplicationsController {
    constructor(private readonly jobApplications: JobApplicationsService) { }

    @Get()
    async list(
        @Query('orgId') orgId: string,
        @Query('userId') userId: string,
        @Query('status') status?: string,
        @Query('priority') priority?: string,
        @Query('companyName') companyName?: string,
        @Query('isRemote') isRemote?: boolean
    ) {
        const filters = {
            status,
            priority,
            companyName,
            isRemote: isRemote === undefined ? undefined : isRemote === true
        };
        return this.jobApplications.list(orgId, userId, filters);
    }

    @Get('stats')
    async getStats(@Query('orgId') orgId: string, @Query('userId') userId: string) {
        return this.jobApplications.getStats(orgId, userId);
    }

    @Get('follow-ups')
    async getUpcomingFollowUps(
        @Query('orgId') orgId: string,
        @Query('userId') userId: string,
        @Query('days') days?: number
    ) {
        return this.jobApplications.getUpcomingFollowUps(orgId, userId, days || 7);
    }

    @Get('search')
    async search(
        @Query('orgId') orgId: string,
        @Query('userId') userId: string,
        @Query('q') query: string
    ) {
        return this.jobApplications.search(orgId, userId, query);
    }

    @Get(':id')
    async get(@Param('id') id: string) {
        return this.jobApplications.get(id);
    }

    @Post()
    async create(@Body() dto: CreateJobApplicationDto) {
        return this.jobApplications.create(dto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateJobApplicationDto) {
        return this.jobApplications.update(id, dto);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.jobApplications.delete(id);
    }

    @Put(':id/status')
    async updateStatus(@Param('id') id: string, @Body('status') status: string) {
        return this.jobApplications.updateStatus(id, status);
    }

    @Post(':id/contacts')
    async addContact(@Param('id') id: string, @Body() dto: AddContactDto) {
        return this.jobApplications.addContact(id, dto);
    }

    @Put(':id/contacts/:contactIndex')
    async updateContact(
        @Param('id') id: string,
        @Param('contactIndex') contactIndex: number,
        @Body() dto: UpdateContactDto
    ) {
        return this.jobApplications.updateContact(id, contactIndex, dto);
    }

    @Delete(':id/contacts/:contactIndex')
    async removeContact(@Param('id') id: string, @Param('contactIndex') contactIndex: number) {
        return this.jobApplications.removeContact(id, contactIndex);
    }

    @Post(':id/follow-ups')
    async addFollowUp(@Param('id') id: string, @Body() dto: AddFollowUpDto) {
        return this.jobApplications.addFollowUp(id, dto);
    }

    @Put(':id/follow-ups/:followUpId')
    async updateFollowUp(
        @Param('id') id: string,
        @Param('followUpId') followUpId: string,
        @Body() dto: UpdateFollowUpDto
    ) {
        return this.jobApplications.updateFollowUp(id, followUpId, dto);
    }

    @Delete(':id/follow-ups/:followUpId')
    async removeFollowUp(@Param('id') id: string, @Param('followUpId') followUpId: string) {
        return this.jobApplications.removeFollowUp(id, followUpId);
    }
}
