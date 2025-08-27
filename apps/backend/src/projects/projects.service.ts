import {
    Injectable,
    NotFoundException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Projects } from '../entities/projects.entity';
import { Organizations } from '../entities/organizations.entity';
import { Jobs } from '../entities/jobs.entity';
import { Users } from '../entities/users.entity';
import { Memberships } from '../entities/memberships.entity';

export interface CreateProjectDto {
    name: string;
    description?: string;
}

export interface UpdateProjectDto {
    name?: string;
    description?: string;
}

@Injectable()
export class ProjectsService {
    private readonly logger = new Logger(ProjectsService.name);

    constructor(
        @InjectRepository(Projects)
        private readonly projectsRepository: Repository<Projects>,
        @InjectRepository(Organizations)
        private readonly organizationsRepository: Repository<Organizations>,
        @InjectRepository(Jobs)
        private readonly jobsRepository: Repository<Jobs>,
        @InjectRepository(Users)
        private readonly usersRepository: Repository<Users>,
        @InjectRepository(Memberships)
        private readonly membershipsRepository: Repository<Memberships>,
    ) { }

    /**
     * Create a new project
     */
    async create(
        createProjectDto: CreateProjectDto,
        organizationId: string,
        userId: string,
    ): Promise<Projects> {
        // Verify organization exists and user has access
        const organization = await this.organizationsRepository.findOne({
            where: { id: organizationId },
        });

        if (!organization) {
            throw new NotFoundException(`Organization with ID ${organizationId} not found`);
        }

        // Check if user is a member of the organization
        const membership = await this.membershipsRepository.findOne({
            where: { userId, organizationId },
        });

        if (!membership) {
            throw new ConflictException(
                `User ${userId} is not a member of organization ${organizationId}`,
            );
        }

        // Create project
        const project = this.projectsRepository.create({
            ...createProjectDto,
            organizationId,
            createdBy: userId,
        });

        const savedProject = await this.projectsRepository.save(project);

        this.logger.log(
            `Created project ${savedProject.name} (${savedProject.id}) in organization ${organizationId} by user ${userId}`,
        );

        return savedProject;
    }

    /**
     * Get project by ID
     */
    async findOne(id: string): Promise<Projects> {
        const project = await this.projectsRepository.findOne({
            where: { id },
            relations: ['organization', 'jobs'],
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${id} not found`);
        }

        return project;
    }

    /**
     * Get all projects for an organization
     */
    async findByOrganization(organizationId: string): Promise<Projects[]> {
        return this.projectsRepository.find({
            where: { organizationId },
            relations: ['organization'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Get projects created by a user
     */
    async findByUser(userId: string): Promise<Projects[]> {
        return this.projectsRepository.find({
            where: { createdBy: userId },
            relations: ['organization'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Update project
     */
    async update(
        id: string,
        updateProjectDto: UpdateProjectDto,
        userId: string,
    ): Promise<Projects> {
        const project = await this.findOne(id);

        // Check if user has permission to update
        // Either the creator or an admin/owner of the organization
        const membership = await this.membershipsRepository.findOne({
            where: { userId, organizationId: project.organizationId },
        });

        const hasPermission = project.createdBy === userId ||
            (membership && ['owner', 'admin'].includes(membership.role));

        if (!hasPermission) {
            throw new ConflictException('Insufficient permissions to update project');
        }

        // Update project
        Object.assign(project, updateProjectDto);
        const updatedProject = await this.projectsRepository.save(project);

        this.logger.log(`Updated project ${id} by user ${userId}`);

        return updatedProject;
    }

    /**
     * Delete project
     */
    async remove(id: string, userId: string): Promise<void> {
        const project = await this.findOne(id);

        // Check if user has permission to delete
        const membership = await this.membershipsRepository.findOne({
            where: { userId, organizationId: project.organizationId },
        });

        const hasPermission = project.createdBy === userId ||
            (membership && ['owner', 'admin'].includes(membership.role));

        if (!hasPermission) {
            throw new ConflictException('Insufficient permissions to delete project');
        }

        // Check if project has associated jobs
        const jobCount = await this.jobsRepository.count({
            where: { projectId: id },
        });

        if (jobCount > 0) {
            throw new ConflictException(
                'Cannot delete project with associated jobs. Please delete all jobs first.',
            );
        }

        // Delete project
        await this.projectsRepository.remove(project);

        this.logger.log(`Deleted project ${id} by user ${userId}`);
    }

    /**
     * Get project statistics
     */
    async getProjectStats(id: string): Promise<any> {
        const project = await this.findOne(id);

        const jobCount = await this.jobsRepository.count({
            where: { projectId: id },
        });

        const jobsByStatus = await this.jobsRepository
            .createQueryBuilder('job')
            .select('job.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('job.projectId = :projectId', { projectId: id })
            .groupBy('job.status')
            .getRawMany();

        return {
            project: {
                id: project.id,
                name: project.name,
                description: project.description,
                createdAt: project.createdAt,
            },
            statistics: {
                totalJobs: jobCount,
                jobsByStatus: jobsByStatus.reduce((acc, stat) => {
                    acc[stat.status] = parseInt(stat.count);
                    return acc;
                }, {}),
            },
        };
    }

    /**
     * Search projects
     */
    async searchProjects(
        organizationId: string,
        query: string,
        userId?: string,
    ): Promise<Projects[]> {
        const qb = this.projectsRepository.createQueryBuilder('project')
            .leftJoinAndSelect('project.organization', 'organization')
            .where('project.organizationId = :organizationId', { organizationId });

        if (query) {
            qb.andWhere(
                '(project.name ILIKE :query OR project.description ILIKE :query)',
                { query: `%${query}%` },
            );
        }

        if (userId) {
            // If userId is provided, filter by user's permissions
            qb.andWhere(
                '(project.createdBy = :userId OR EXISTS (SELECT 1 FROM memberships m WHERE m.userId = :userId AND m.organizationId = project.organizationId AND m.role IN (\'owner\', \'admin\')))',
                { userId },
            );
        }

        return qb.orderBy('project.createdAt', 'DESC').getMany();
    }

    /**
     * Clone project
     */
    async cloneProject(id: string, userId: string, name?: string): Promise<Projects> {
        const originalProject = await this.findOne(id);

        // Check if user has permission to read the original project
        const membership = await this.membershipsRepository.findOne({
            where: { userId, organizationId: originalProject.organizationId },
        });

        if (!membership) {
            throw new ConflictException('Insufficient permissions to clone project');
        }

        // Create cloned project
        const clonedProject = this.projectsRepository.create({
            name: name || `${originalProject.name} (Copy)`,
            description: originalProject.description,
            organizationId: originalProject.organizationId,
            createdBy: userId,
        });

        const savedProject = await this.projectsRepository.save(clonedProject);

        this.logger.log(`Cloned project ${id} to ${savedProject.id} by user ${userId}`);

        return savedProject;
    }
}
