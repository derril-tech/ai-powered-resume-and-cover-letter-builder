import {
    Injectable,
    NotFoundException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Organizations } from '../entities/organizations.entity';
import { Users } from '../entities/users.entity';
import { Memberships } from '../entities/memberships.entity';
import { RoleService } from '../rbac/role.service';

export interface CreateOrganizationDto {
    name: string;
    slug?: string;
    description?: string;
    website?: string;
    logoUrl?: string;
}

export interface UpdateOrganizationDto {
    name?: string;
    description?: string;
    website?: string;
    logoUrl?: string;
}

@Injectable()
export class OrganizationsService {
    private readonly logger = new Logger(OrganizationsService.name);

    constructor(
        @InjectRepository(Organizations)
        private readonly organizationsRepository: Repository<Organizations>,
        @InjectRepository(Users)
        private readonly usersRepository: Repository<Users>,
        @InjectRepository(Memberships)
        private readonly membershipsRepository: Repository<Memberships>,
        private readonly roleService: RoleService,
        private readonly dataSource: DataSource,
    ) { }

    /**
     * Create a new organization
     */
    async create(
        createOrganizationDto: CreateOrganizationDto,
        ownerId: string,
    ): Promise<Organizations> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Check if organization slug already exists
            const slug = createOrganizationDto.slug || this.generateSlug(createOrganizationDto.name);
            const existingOrg = await this.organizationsRepository.findOne({
                where: { slug },
            });

            if (existingOrg) {
                throw new ConflictException(`Organization with slug '${slug}' already exists`);
            }

            // Verify owner exists
            const owner = await this.usersRepository.findOne({
                where: { id: ownerId },
            });

            if (!owner) {
                throw new NotFoundException(`User with ID ${ownerId} not found`);
            }

            // Create organization
            const organization = this.organizationsRepository.create({
                ...createOrganizationDto,
                slug,
            });

            const savedOrganization = await queryRunner.manager.save(Organizations, organization);

            // Create membership for the owner
            const membership = this.membershipsRepository.create({
                userId: ownerId,
                organizationId: savedOrganization.id,
                role: 'owner',
                joinedAt: new Date(),
            });

            await queryRunner.manager.save(Memberships, membership);

            // Assign RBAC role
            await this.roleService.assignRole({
                userId: ownerId,
                role: 'owner',
                organizationId: savedOrganization.id,
            });

            await queryRunner.commitTransaction();

            this.logger.log(
                `Created organization ${savedOrganization.name} (${savedOrganization.id}) with owner ${ownerId}`,
            );

            return savedOrganization;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Get organization by ID
     */
    async findOne(id: string): Promise<Organizations> {
        const organization = await this.organizationsRepository.findOne({
            where: { id },
        });

        if (!organization) {
            throw new NotFoundException(`Organization with ID ${id} not found`);
        }

        return organization;
    }

    /**
     * Get organization by slug
     */
    async findBySlug(slug: string): Promise<Organizations> {
        const organization = await this.organizationsRepository.findOne({
            where: { slug },
        });

        if (!organization) {
            throw new NotFoundException(`Organization with slug '${slug}' not found`);
        }

        return organization;
    }

    /**
     * Get organizations for a user
     */
    async findByUserId(userId: string): Promise<Organizations[]> {
        const memberships = await this.membershipsRepository.find({
            where: { userId },
            relations: ['organization'],
        });

        return memberships.map(membership => membership.organization);
    }

    /**
     * Update organization
     */
    async update(
        id: string,
        updateOrganizationDto: UpdateOrganizationDto,
        userId: string,
    ): Promise<Organizations> {
        const organization = await this.findOne(id);

        // Check if user has permission to update (must be owner or admin)
        const membership = await this.membershipsRepository.findOne({
            where: { userId, organizationId: id },
        });

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            throw new ConflictException('Insufficient permissions to update organization');
        }

        // Update organization
        Object.assign(organization, updateOrganizationDto);
        const updatedOrganization = await this.organizationsRepository.save(organization);

        this.logger.log(`Updated organization ${id} by user ${userId}`);

        return updatedOrganization;
    }

    /**
     * Delete organization
     */
    async remove(id: string, userId: string): Promise<void> {
        const organization = await this.findOne(id);

        // Check if user is the owner
        const membership = await this.membershipsRepository.findOne({
            where: { userId, organizationId: id },
        });

        if (!membership || membership.role !== 'owner') {
            throw new ConflictException('Only organization owner can delete the organization');
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Remove all memberships and revoke roles
            const memberships = await this.membershipsRepository.find({
                where: { organizationId: id },
            });

            for (const membership of memberships) {
                await this.roleService.removeMemberRoles(membership.userId, id);
            }

            // Delete memberships
            await queryRunner.manager.delete(Memberships, { organizationId: id });

            // Delete organization
            await queryRunner.manager.delete(Organizations, { id });

            await queryRunner.commitTransaction();

            this.logger.log(`Deleted organization ${id} by user ${userId}`);
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Get organization members
     */
    async getMembers(organizationId: string): Promise<any[]> {
        await this.findOne(organizationId); // Verify organization exists

        const memberships = await this.membershipsRepository.find({
            where: { organizationId },
            relations: ['user'],
            order: { joinedAt: 'ASC' },
        });

        return memberships.map(membership => ({
            id: membership.userId,
            email: membership.user.email,
            firstName: membership.user.firstName,
            lastName: membership.user.lastName,
            role: membership.role,
            joinedAt: membership.joinedAt,
        }));
    }

    /**
     * Invite user to organization
     */
    async inviteUser(
        organizationId: string,
        email: string,
        role: 'owner' | 'admin' | 'editor' | 'viewer',
        inviterId: string,
    ): Promise<{ message: string }> {
        await this.findOne(organizationId);

        // Check if inviter has permission
        const inviterMembership = await this.membershipsRepository.findOne({
            where: { userId: inviterId, organizationId },
        });

        if (!inviterMembership || !['owner', 'admin'].includes(inviterMembership.role)) {
            throw new ConflictException('Insufficient permissions to invite users');
        }

        // Find or create user
        let user = await this.usersRepository.findOne({ where: { email } });
        if (!user) {
            // In a real implementation, you'd send an invitation email
            // For now, we'll create the user as unverified
            user = this.usersRepository.create({
                email,
                emailVerified: false,
            });
            user = await this.usersRepository.save(user);
        }

        // Check if user is already a member
        const existingMembership = await this.membershipsRepository.findOne({
            where: { userId: user.id, organizationId },
        });

        if (existingMembership) {
            throw new ConflictException('User is already a member of this organization');
        }

        // Create membership
        const membership = this.membershipsRepository.create({
            userId: user.id,
            organizationId,
            role,
            invitedAt: new Date(),
        });

        await this.membershipsRepository.save(membership);

        // Assign RBAC role
        await this.roleService.assignRole({
            userId: user.id,
            role,
            organizationId,
        });

        this.logger.log(
            `Invited user ${email} to organization ${organizationId} with role ${role}`,
        );

        return { message: 'User invited successfully' };
    }

    /**
     * Remove user from organization
     */
    async removeMember(organizationId: string, userId: string, removerId: string): Promise<void> {
        await this.findOne(organizationId);

        // Check if remover has permission
        const removerMembership = await this.membershipsRepository.findOne({
            where: { userId: removerId, organizationId },
        });

        if (!removerMembership || !['owner', 'admin'].includes(removerMembership.role)) {
            throw new ConflictException('Insufficient permissions to remove members');
        }

        // Cannot remove yourself
        if (removerId === userId) {
            throw new ConflictException('Cannot remove yourself from organization');
        }

        // Find membership to remove
        const membership = await this.membershipsRepository.findOne({
            where: { userId, organizationId },
        });

        if (!membership) {
            throw new NotFoundException('User is not a member of this organization');
        }

        // Cannot remove owner
        if (membership.role === 'owner') {
            throw new ConflictException('Cannot remove organization owner');
        }

        // Remove membership and revoke roles
        await this.membershipsRepository.remove(membership);
        await this.roleService.removeMemberRoles(userId, organizationId);

        this.logger.log(`Removed user ${userId} from organization ${organizationId}`);
    }

    /**
     * Transfer organization ownership
     */
    async transferOwnership(
        organizationId: string,
        newOwnerId: string,
        currentOwnerId: string,
    ): Promise<void> {
        return this.roleService.transferOwnership(organizationId, currentOwnerId, newOwnerId);
    }

    /**
     * Generate URL-friendly slug from organization name
     */
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    }
}
