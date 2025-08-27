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
import { ProjectsService, CreateProjectDto, UpdateProjectDto } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReadProjects, WriteProjects, DeleteProjects } from '../rbac/decorators/rbac.decorator';

@ApiTags('projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) { }

    @Post()
    @WriteProjects()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new project' })
    @ApiResponse({ status: 201, description: 'Project created successfully' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    async create(
        @Body() createProjectDto: CreateProjectDto,
        @Query('orgId') organizationId: string,
        @Request() req: any,
    ) {
        return this.projectsService.create(createProjectDto, organizationId, req.user.id);
    }

    @Get()
    @ReadProjects()
    @ApiOperation({ summary: 'Get projects' })
    @ApiResponse({ status: 200, description: 'List of projects' })
    @ApiQuery({ name: 'orgId', description: 'Organization ID' })
    @ApiQuery({ name: 'q', required: false, description: 'Search query' })
    async findAll(
        @Query('orgId') organizationId: string,
        @Query('q') query?: string,
        @Request() req?: any,
    ) {
        if (query) {
            return this.projectsService.searchProjects(organizationId, query, req?.user?.id);
        }
        return this.projectsService.findByOrganization(organizationId);
    }

    @Get('my-projects')
    @ReadProjects()
    @ApiOperation({ summary: 'Get user\'s projects' })
    @ApiResponse({ status: 200, description: 'List of user projects' })
    async findUserProjects(@Request() req: any) {
        return this.projectsService.findByUser(req.user.id);
    }

    @Get(':id')
    @ReadProjects()
    @ApiOperation({ summary: 'Get project by ID' })
    @ApiResponse({ status: 200, description: 'Project details' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    async findOne(@Param('id') id: string) {
        return this.projectsService.findOne(id);
    }

    @Get(':id/stats')
    @ReadProjects()
    @ApiOperation({ summary: 'Get project statistics' })
    @ApiResponse({ status: 200, description: 'Project statistics' })
    async getStats(@Param('id') id: string) {
        return this.projectsService.getProjectStats(id);
    }

    @Put(':id')
    @WriteProjects()
    @ApiOperation({ summary: 'Update project' })
    @ApiResponse({ status: 200, description: 'Project updated successfully' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    async update(
        @Param('id') id: string,
        @Body() updateProjectDto: UpdateProjectDto,
        @Request() req: any,
    ) {
        return this.projectsService.update(id, updateProjectDto, req.user.id);
    }

    @Delete(':id')
    @DeleteProjects()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete project' })
    @ApiResponse({ status: 204, description: 'Project deleted successfully' })
    @ApiResponse({ status: 409, description: 'Cannot delete project with jobs' })
    async remove(@Param('id') id: string, @Request() req: any) {
        await this.projectsService.remove(id, req.user.id);
    }

    @Post(':id/clone')
    @WriteProjects()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Clone project' })
    @ApiResponse({ status: 201, description: 'Project cloned successfully' })
    async cloneProject(
        @Param('id') id: string,
        @Body() cloneDto: { name?: string },
        @Request() req: any,
    ) {
        return this.projectsService.cloneProject(id, req.user.id, cloneDto.name);
    }
}
