import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import { JobsService, CreateJobDto, UpdateJobDto, JobStatus } from './jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReadJobs, WriteJobs, DeleteJobs } from '../rbac/decorators/rbac.decorator';

@ApiTags('jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class JobsController {
    constructor(private readonly jobsService: JobsService) { }

    @Post()
    @WriteJobs()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new job' })
    @ApiResponse({ status: 201, description: 'Job created successfully' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    async create(
        @Body() createJobDto: CreateJobDto,
        @Query('projectId') projectId: string,
        @Request() req: any,
    ) {
        return this.jobsService.create(createJobDto, projectId, req.user.id);
    }

    @Get()
    @ReadJobs()
    @ApiOperation({ summary: 'Get jobs' })
    @ApiResponse({ status: 200, description: 'List of jobs' })
    @ApiQuery({ name: 'orgId', description: 'Organization ID' })
    @ApiQuery({ name: 'projectId', required: false, description: 'Project ID' })
    @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published', 'archived'], description: 'Job status' })
    @ApiQuery({ name: 'q', required: false, description: 'Search query' })
    @ApiQuery({ name: 'company', required: false, description: 'Company filter' })
    @ApiQuery({ name: 'location', required: false, description: 'Location filter' })
    async findAll(
        @Query('orgId') organizationId: string,
        @Query('projectId') projectId?: string,
        @Query('status') status?: JobStatus,
        @Query('q') query?: string,
        @Query('company') company?: string,
        @Query('location') location?: string,
    ) {
        if (query || status || company || location) {
            return this.jobsService.searchJobs(organizationId, query || '', {
                status,
                projectId,
                company,
                location,
            });
        }

        if (projectId) {
            return this.jobsService.findByProject(projectId);
        }

        return this.jobsService.findByOrganization(organizationId);
    }

    @Get('by-status/:status')
    @ReadJobs()
    @ApiOperation({ summary: 'Get jobs by status' })
    @ApiResponse({ status: 200, description: 'List of jobs by status' })
    @ApiQuery({ name: 'orgId', description: 'Organization ID' })
    async findByStatus(
        @Param('status') status: JobStatus,
        @Query('orgId') organizationId: string,
    ) {
        return this.jobsService.findByStatus(status, organizationId);
    }

    @Get(':id')
    @ReadJobs()
    @ApiOperation({ summary: 'Get job by ID' })
    @ApiResponse({ status: 200, description: 'Job details' })
    @ApiResponse({ status: 404, description: 'Job not found' })
    async findOne(@Param('id') id: string) {
        return this.jobsService.findOne(id);
    }

    @Put(':id')
    @WriteJobs()
    @ApiOperation({ summary: 'Update job' })
    @ApiResponse({ status: 200, description: 'Job updated successfully' })
    @ApiResponse({ status: 404, description: 'Job not found' })
    async update(
        @Param('id') id: string,
        @Body() updateJobDto: UpdateJobDto,
        @Request() req: any,
    ) {
        return this.jobsService.update(id, updateJobDto, req.user.id);
    }

    @Delete(':id')
    @DeleteJobs()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete job' })
    @ApiResponse({ status: 204, description: 'Job deleted successfully' })
    @ApiResponse({ status: 409, description: 'Cannot delete job' })
    async remove(@Param('id') id: string, @Request() req: any) {
        await this.jobsService.remove(id, req.user.id);
    }

    @Post(':id/parse')
    @WriteJobs()
    @ApiOperation({ summary: 'Parse job description' })
    @ApiResponse({ status: 200, description: 'Job parsed successfully' })
    async parseDescription(@Param('id') id: string) {
        return this.jobsService.parseJobDescription(id);
    }

    @Post(':id/duplicate')
    @WriteJobs()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Duplicate job' })
    @ApiResponse({ status: 201, description: 'Job duplicated successfully' })
    async duplicateJob(
        @Param('id') id: string,
        @Body() duplicateDto: Partial<CreateJobDto>,
        @Request() req: any,
    ) {
        return this.jobsService.duplicateJob(id, req.user.id, duplicateDto);
    }

    @Get('stats/organization')
    @ReadJobs()
    @ApiOperation({ summary: 'Get job statistics for organization' })
    @ApiResponse({ status: 200, description: 'Job statistics' })
    @ApiQuery({ name: 'orgId', description: 'Organization ID' })
    async getOrganizationStats(@Query('orgId') organizationId: string) {
        return this.jobsService.getJobStats(organizationId);
    }

    @Get('stats/global')
    @ReadJobs()
    @ApiOperation({ summary: 'Get global job statistics' })
    @ApiResponse({ status: 200, description: 'Global job statistics' })
    async getGlobalStats() {
        return this.jobsService.getJobStats();
    }
}
