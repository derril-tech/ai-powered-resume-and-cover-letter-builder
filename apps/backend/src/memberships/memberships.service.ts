import {
    Injectable,
    NotFoundException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Memberships } from '../entities/memberships.entity';
import { Users } from '../entities/users.entity';
import { Organizations } from '../entities/organizations.entity';
import { RoleService } from '../rbac/role.service';

export interface UpdateMembershipDto {
    role: 'owner' | 'admin' | 'editor' | 'viewer';
}

@Injectable()
export class MembershipsService {
    private readonly logger = new Logger(MembershipsService.name);

    constructor(
        @InjectRepository(Memberships)
        private readonly membershipsRepository: Repository<Memberships>,
        @InjectRepository(Users)
        private readonly usersRepository: Repository<Users>,
        @InjectRepository(Organizations)
        private readonly organizationsRepository: Repository<Organizations>,
        private readonly roleService: RoleService,
    ) { }

    /**
     * Get membership by ID
     */
    async findOne(id: string): Promise<Memberships> {
        const membership = await this.membershipsRepository.findOne({
            where: { id },
            relations: ['user', 'organization'],
        });

        if (!membership) {
            throw new NotFoundException(`Membership with ID ${id} not found`);
        }

        return membership;
    }

    /**
     * Get membership by user and organization
     */
    async findByUserAndOrganization(
        userId: string,
        organizationId: string,
    ): Promise<Memberships> {
        const membership = await this.membershipsRepository.findOne({
            where: { userId, organizationId },
            relations: ['user', 'organization'],
        });

        if (!membership) {
            throw new NotFoundException(
                `User ${userId} is not a member of organization ${organizationId}`,
            );
        }

        return membership;
    }

    /**
     * Get all memberships for an organization
     */
    async findByOrganization(organizationId: string): Promise<Memberships[]> {
        return this.membershipsRepository.find({
            where: { organizationId },
            relations: ['user'],
            order: { joinedAt: 'ASC' },
        });
    }

    /**
     * Get all memberships for a user
     */
    async findByUser(userId: string): Promise<Memberships[]> {
        return this.membershipsRepository.find({
            where: { userId },
            relations: ['organization'],
            order: { joinedAt: 'ASC' },
        });
    }

    /**
     * Create a new membership
     */
    async create(
        userId: string,
        organizationId: string,
        role: 'owner' | 'admin' | 'editor' | 'viewer',
    ): Promise<Memberships> {
        // Verify user and organization exist
        await this.usersRepository.findOneOrFail({ where: { id: userId } });
        await this.organizationsRepository.findOneOrFail({ where: { id: organizationId } });

        // Check if membership already exists
        const existingMembership = await this.membershipsRepository.findOne({
            where: { userId, organizationId },
        });

        if (existingMembership) {
            throw new ConflictException(
                `User ${userId} is already a member of organization ${organizationId}`,
            );
        }

        // Create membership
        const membership = this.membershipsRepository.create({
            userId,
            organizationId,
            role,
            joinedAt: new Date(),
        });

        const savedMembership = await this.membershipsRepository.save(membership);

        // Assign RBAC role
        await this.roleService.assignRole({
            userId,
            role,
            organizationId,
        });

        this.logger.log(
            `Created membership for user ${userId} in organization ${organizationId} with role ${role}`,
        );

        return savedMembership;
    }

    /**
     * Update membership role
     */
    async updateRole(
        id: string,
        updateMembershipDto: UpdateMembershipDto,
        updaterId: string,
    ): Promise<Memberships> {
        const membership = await this.findOne(id);

        // Check if updater has permission to change roles
        const updaterMembership = await this.membershipsRepository.findOne({
            where: { userId: updaterId, organizationId: membership.organizationId },
        });

        if (!updaterMembership || !['owner', 'admin'].includes(updaterMembership.role)) {
            throw new ConflictException('Insufficient permissions to update member roles');
        }

        // Cannot change owner's role
        if (membership.role === 'owner') {
            throw new ConflictException('Cannot change organization owner\'s role');
        }

        // Cannot change your own role
        if (membership.userId === updaterId) {
            throw new ConflictException('Cannot change your own role');
        }

        const oldRole = membership.role;
        membership.role = updateMembershipDto.role;

        const updatedMembership = await this.membershipsRepository.save(membership);

        // Update RBAC role
        await this.roleService.revokeRole({
            userId: membership.userId,
            role: oldRole,
            organizationId: membership.organizationId,
        });

        await this.roleService.assignRole({
            userId: membership.userId,
            role: updateMembershipDto.role,
            organizationId: membership.organizationId,
        });

        this.logger.log(
            `Updated role for user ${membership.userId} in organization ${membership.organizationId} from ${oldRole} to ${updateMembershipDto.role}`,
        );

        return updatedMembership;
    }

    /**
     * Accept membership invitation
     */
    async acceptInvitation(id: string, userId: string): Promise<Memberships> {
        const membership = await this.findOne(id);

        // Verify the membership belongs to the user
        if (membership.userId !== userId) {
            throw new ConflictException('Membership invitation does not belong to this user');
        }

        // Check if already joined
        if (membership.joinedAt) {
            throw new ConflictException('Membership invitation has already been accepted');
        }

        membership.joinedAt = new Date();
        const updatedMembership = await this.membershipsRepository.save(membership);

        this.logger.log(`User ${userId} accepted invitation to organization ${membership.organizationId}`);

        return updatedMembership;
    }

    /**
     * Remove membership
     */
    async remove(id: string, removerId: string): Promise<void> {
        const membership = await this.findOne(id);

        // Check if remover has permission
        const removerMembership = await this.membershipsRepository.findOne({
            where: { userId: removerId, organizationId: membership.organizationId },
        });

        if (!removerMembership || !['owner', 'admin'].includes(removerMembership.role)) {
            throw new ConflictException('Insufficient permissions to remove members');
        }

        // Cannot remove owner
        if (membership.role === 'owner') {
            throw new ConflictException('Cannot remove organization owner');
        }

        // Cannot remove yourself
        if (membership.userId === removerId) {
            throw new ConflictException('Cannot remove yourself from organization');
        }

        // Revoke RBAC roles
        await this.roleService.removeMemberRoles(
            membership.userId,
            membership.organizationId,
        );

        // Remove membership
        await this.membershipsRepository.remove(membership);

        this.logger.log(`Removed membership ${id} by user ${removerId}`);
    }

    /**
     * Get pending invitations for a user
     */
    async getPendingInvitations(userId: string): Promise<Memberships[]> {
        return this.membershipsRepository.find({
            where: { userId, joinedAt: null },
            relations: ['organization'],
            order: { invitedAt: 'DESC' },
        });
    }

    /**
     * Get organization member statistics
     */
    async getOrganizationStats(organizationId: string): Promise<any> {
        const memberships = await this.membershipsRepository.find({
            where: { organizationId },
        });

        const totalMembers = memberships.length;
        const activeMembers = memberships.filter(m => m.joinedAt).length;
        const pendingInvitations = totalMembers - activeMembers;

        const roleStats = {
            owner: memberships.filter(m => m.role === 'owner').length,
            admin: memberships.filter(m => m.role === 'admin').length,
            editor: memberships.filter(m => m.role === 'editor').length,
            viewer: memberships.filter(m => m.role === 'viewer').length,
        };

        return {
            totalMembers,
            activeMembers,
            pendingInvitations,
            roles: roleStats,
        };
    }
}
