import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '../../entities/users.entity';
import { Organizations } from '../../entities/organizations.entity';
import { Memberships } from '../../entities/memberships.entity';
import { RoleService } from '../../../rbac/role.service';

export interface ScimUser {
    id?: string;
    externalId?: string;
    userName: string;
    name?: {
        givenName?: string;
        familyName?: string;
        formatted?: string;
    };
    emails?: Array<{
        value: string;
        type?: string;
        primary?: boolean;
    }>;
    active?: boolean;
    groups?: Array<{
        value: string;
        display: string;
    }>;
    meta?: {
        resourceType?: string;
        created?: string;
        lastModified?: string;
        location?: string;
    };
}

export interface ScimGroup {
    id?: string;
    displayName: string;
    members?: Array<{
        value: string;
        display: string;
    }>;
    meta?: {
        resourceType?: string;
        created?: string;
        lastModified?: string;
        location?: string;
    };
}

@Injectable()
export class ScimService {
    private readonly logger = new Logger(ScimService.name);

    constructor(
        @InjectRepository(Users)
        private readonly usersRepository: Repository<Users>,
        @InjectRepository(Organizations)
        private readonly organizationsRepository: Repository<Organizations>,
        @InjectRepository(Memberships)
        private readonly membershipsRepository: Repository<Memberships>,
        private readonly roleService: RoleService,
    ) { }

    /**
     * Create a new user via SCIM
     */
    async createUser(scimUser: ScimUser, organizationId: string): Promise<ScimUser> {
        try {
            // Check if organization exists
            const organization = await this.organizationsRepository.findOne({
                where: { id: organizationId },
            });

            if (!organization) {
                throw new NotFoundException(`Organization ${organizationId} not found`);
            }

            // Check if user already exists
            const primaryEmail = scimUser.emails?.find(email => email.primary)?.value || scimUser.emails?.[0]?.value;
            if (!primaryEmail) {
                throw new ConflictException('User must have at least one email address');
            }

            const existingUser = await this.usersRepository.findOne({
                where: { email: primaryEmail },
            });

            if (existingUser) {
                // Check if membership exists
                const existingMembership = await this.membershipsRepository.findOne({
                    where: { userId: existingUser.id, organizationId },
                });

                if (existingMembership) {
                    throw new ConflictException(`User ${primaryEmail} already exists in organization`);
                }

                // Add user to organization
                await this.membershipsRepository.save({
                    userId: existingUser.id,
                    organizationId,
                    role: 'viewer', // Default role
                });

                return this.mapUserToScim(existingUser, organizationId);
            }

            // Create new user
            const newUser = this.usersRepository.create({
                email: primaryEmail,
                firstName: scimUser.name?.givenName,
                lastName: scimUser.name?.familyName,
                emailVerified: true, // SCIM users are typically pre-verified
            });

            const savedUser = await this.usersRepository.save(newUser);

            // Create membership
            await this.membershipsRepository.save({
                userId: savedUser.id,
                organizationId,
                role: 'viewer',
            });

            this.logger.log(`Created SCIM user ${primaryEmail} in organization ${organizationId}`);

            return this.mapUserToScim(savedUser, organizationId);
        } catch (error) {
            this.logger.error('Failed to create SCIM user:', error);
            throw error;
        }
    }

    /**
     * Get user by SCIM ID
     */
    async getUser(scimUserId: string, organizationId: string): Promise<ScimUser> {
        const user = await this.usersRepository.findOne({
            where: { id: scimUserId },
        });

        if (!user) {
            throw new NotFoundException(`User ${scimUserId} not found`);
        }

        // Verify user belongs to organization
        const membership = await this.membershipsRepository.findOne({
            where: { userId: scimUserId, organizationId },
        });

        if (!membership) {
            throw new NotFoundException(`User ${scimUserId} not found in organization ${organizationId}`);
        }

        return this.mapUserToScim(user, organizationId);
    }

    /**
     * Update user via SCIM
     */
    async updateUser(scimUserId: string, organizationId: string, scimUser: Partial<ScimUser>): Promise<ScimUser> {
        const user = await this.usersRepository.findOne({
            where: { id: scimUserId },
        });

        if (!user) {
            throw new NotFoundException(`User ${scimUserId} not found`);
        }

        // Verify membership
        const membership = await this.membershipsRepository.findOne({
            where: { userId: scimUserId, organizationId },
        });

        if (!membership) {
            throw new NotFoundException(`User ${scimUserId} not found in organization ${organizationId}`);
        }

        // Update user fields
        if (scimUser.name?.givenName) {
            user.firstName = scimUser.name.givenName;
        }
        if (scimUser.name?.familyName) {
            user.lastName = scimUser.name.familyName;
        }

        const updatedUser = await this.usersRepository.save(user);

        this.logger.log(`Updated SCIM user ${scimUserId} in organization ${organizationId}`);

        return this.mapUserToScim(updatedUser, organizationId);
    }

    /**
     * Delete user via SCIM (deactivate membership)
     */
    async deleteUser(scimUserId: string, organizationId: string): Promise<void> {
        const membership = await this.membershipsRepository.findOne({
            where: { userId: scimUserId, organizationId },
        });

        if (!membership) {
            throw new NotFoundException(`User ${scimUserId} not found in organization ${organizationId}`);
        }

        // Remove membership instead of deleting user
        await this.membershipsRepository.remove(membership);

        this.logger.log(`Removed SCIM user ${scimUserId} from organization ${organizationId}`);
    }

    /**
     * List users in organization
     */
    async listUsers(organizationId: string, filter?: string, startIndex: number = 1, count: number = 100): Promise<{
        Resources: ScimUser[];
        totalResults: number;
        startIndex: number;
        itemsPerPage: number;
    }> {
        // Get all memberships for the organization
        const memberships = await this.membershipsRepository.find({
            where: { organizationId },
            relations: ['user'],
            skip: startIndex - 1,
            take: count,
        });

        const users = memberships.map(membership => membership.user);
        const scimUsers = users.map(user => this.mapUserToScim(user, organizationId));

        return {
            Resources: scimUsers,
            totalResults: scimUsers.length,
            startIndex,
            itemsPerPage: count,
        };
    }

    /**
     * Create group (organization role mapping)
     */
    async createGroup(scimGroup: ScimGroup, organizationId: string): Promise<ScimGroup> {
        // In this implementation, groups map to roles
        // This is a simplified implementation
        return {
            ...scimGroup,
            id: scimGroup.displayName.toLowerCase(),
            meta: {
                resourceType: 'Group',
                created: new Date().toISOString(),
                location: `/Groups/${scimGroup.displayName.toLowerCase()}`,
            },
        };
    }

    /**
     * Map internal user to SCIM format
     */
    private mapUserToScim(user: Users, organizationId: string): ScimUser {
        return {
            id: user.id,
            userName: user.email,
            name: {
                givenName: user.firstName || '',
                familyName: user.lastName || '',
                formatted: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            },
            emails: [{
                value: user.email,
                type: 'work',
                primary: true,
            }],
            active: true,
            meta: {
                resourceType: 'User',
                created: user.createdAt.toISOString(),
                lastModified: user.updatedAt.toISOString(),
                location: `/Users/${user.id}`,
            },
        };
    }
}
