import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RbacService, RoleAssignment } from './rbac.service';
import { Memberships } from '../entities/memberships.entity';
import { Users } from '../entities/users.entity';
import { Organizations } from '../entities/organizations.entity';

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

@Injectable()
export class RoleService {
    private readonly logger = new Logger(RoleService.name);

    constructor(
        private readonly rbacService: RbacService,
        @InjectRepository(Memberships)
        private readonly membershipsRepository: Repository<Memberships>,
        @InjectRepository(Users)
        private readonly usersRepository: Repository<Users>,
        @InjectRepository(Organizations)
        private readonly organizationsRepository: Repository<Organizations>,
    ) { }

    /**
     * Assign a role to a user in an organization
     */
    async assignRole(
        userId: string,
        organizationId: string,
        role: UserRole,
    ): Promise<boolean> {
        // Validate that user and organization exist
        const user = await this.usersRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        const organization = await this.organizationsRepository.findOne({
            where: { id: organizationId },
        });
        if (!organization) {
            throw new NotFoundException(`Organization with ID ${organizationId} not found`);
        }

        // Check if membership exists
        const membership = await this.membershipsRepository.findOne({
            where: { userId, organizationId },
        });

        if (!membership) {
            throw new NotFoundException(
                `User ${userId} is not a member of organization ${organizationId}`,
            );
        }

        // Assign role in Casbin
        const assignment: RoleAssignment = {
            userId,
            role,
            organizationId,
        };

        const success = await this.rbacService.assignRole(assignment);
        if (success) {
            // Update membership with role
            await this.membershipsRepository.update(
                { userId, organizationId },
                { role },
            );

            this.logger.log(
                `Assigned role ${role} to user ${userId} in organization ${organizationId}`,
            );
        }

        return success;
    }

    /**
     * Revoke a role from a user in an organization
     */
    async revokeRole(
        userId: string,
        organizationId: string,
        role: UserRole,
    ): Promise<boolean> {
        const assignment: RoleAssignment = {
            userId,
            role,
            organizationId,
        };

        const success = await this.rbacService.revokeRole(assignment);
        if (success) {
            // Optionally update membership role to default (viewer)
            await this.membershipsRepository.update(
                { userId, organizationId },
                { role: 'viewer' },
            );

            this.logger.log(
                `Revoked role ${role} from user ${userId} in organization ${organizationId}`,
            );
        }

        return success;
    }

    /**
     * Get user's role in an organization
     */
    async getUserRole(userId: string, organizationId: string): Promise<UserRole> {
        const membership = await this.membershipsRepository.findOne({
            where: { userId, organizationId },
        });

        if (!membership) {
            throw new NotFoundException(
                `User ${userId} is not a member of organization ${organizationId}`,
            );
        }

        return membership.role as UserRole;
    }

    /**
     * Get all users with a specific role in an organization
     */
    async getUsersWithRole(
        organizationId: string,
        role: UserRole,
    ): Promise<Users[]> {
        const memberships = await this.membershipsRepository.find({
            where: { organizationId, role },
            relations: ['user'],
        });

        return memberships.map(membership => membership.user);
    }

    /**
     * Check if user has a specific role in an organization
     */
    async hasRole(
        userId: string,
        organizationId: string,
        role: UserRole,
    ): Promise<boolean> {
        try {
            const userRole = await this.getUserRole(userId, organizationId);
            return userRole === role;
        } catch {
            return false;
        }
    }

    /**
     * Check if user has any of the specified roles in an organization
     */
    async hasAnyRole(
        userId: string,
        organizationId: string,
        roles: UserRole[],
    ): Promise<boolean> {
        try {
            const userRole = await this.getUserRole(userId, organizationId);
            return roles.includes(userRole);
        } catch {
            return false;
        }
    }

    /**
     * Get user's roles across all organizations
     */
    async getUserRoles(userId: string): Promise<Record<string, UserRole>> {
        const memberships = await this.membershipsRepository.find({
            where: { userId },
            relations: ['organization'],
        });

        const roles: Record<string, UserRole> = {};
        memberships.forEach(membership => {
            roles[membership.organizationId] = membership.role as UserRole;
        });

        return roles;
    }

    /**
     * Get organization members with their roles
     */
    async getOrganizationMembers(
        organizationId: string,
    ): Promise<Array<{ user: Users; role: UserRole }>> {
        const memberships = await this.membershipsRepository.find({
            where: { organizationId },
            relations: ['user'],
        });

        return memberships.map(membership => ({
            user: membership.user,
            role: membership.role as UserRole,
        }));
    }

    /**
     * Transfer ownership of an organization
     */
    async transferOwnership(
        organizationId: string,
        currentOwnerId: string,
        newOwnerId: string,
    ): Promise<boolean> {
        // Verify current owner
        const isOwner = await this.hasRole(currentOwnerId, organizationId, 'owner');
        if (!isOwner) {
            throw new Error('Current user is not the owner of this organization');
        }

        // Check if new owner is a member
        const newOwnerMembership = await this.membershipsRepository.findOne({
            where: { userId: newOwnerId, organizationId },
        });

        if (!newOwnerMembership) {
            throw new Error('New owner must be a member of the organization');
        }

        // Transfer ownership
        await this.membershipsRepository.update(
            { userId: currentOwnerId, organizationId },
            { role: 'admin' },
        );

        await this.membershipsRepository.update(
            { userId: newOwnerId, organizationId },
            { role: 'owner' },
        );

        // Update Casbin roles
        await this.rbacService.revokeRole({
            userId: currentOwnerId,
            role: 'owner',
            organizationId,
        });

        await this.rbacService.assignRole({
            userId: newOwnerId,
            role: 'owner',
            organizationId,
        });

        this.logger.log(
            `Transferred ownership of organization ${organizationId} from ${currentOwnerId} to ${newOwnerId}`,
        );

        return true;
    }

    /**
     * Initialize roles for a new organization member
     */
    async initializeMemberRole(
        userId: string,
        organizationId: string,
        role: UserRole = 'viewer',
    ): Promise<void> {
        const assignment: RoleAssignment = {
            userId,
            role,
            organizationId,
        };

        await this.rbacService.assignRole(assignment);

        this.logger.log(
            `Initialized role ${role} for user ${userId} in organization ${organizationId}`,
        );
    }

    /**
     * Remove all roles for a user in an organization (when leaving)
     */
    async removeMemberRoles(userId: string, organizationId: string): Promise<void> {
        const roles = await this.rbacService.getUserRoles(userId, organizationId);

        for (const role of roles) {
            await this.rbacService.revokeRole({
                userId,
                role,
                organizationId,
            });
        }

        this.logger.log(
            `Removed all roles for user ${userId} in organization ${organizationId}`,
        );
    }
}
