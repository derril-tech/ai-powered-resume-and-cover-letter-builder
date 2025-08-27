import {
    Injectable,
    NotFoundException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '../entities/users.entity';
import { Memberships } from '../entities/memberships.entity';

export interface UpdateUserDto {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
}

export interface ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectRepository(Users)
        private readonly usersRepository: Repository<Users>,
        @InjectRepository(Memberships)
        private readonly membershipsRepository: Repository<Memberships>,
    ) { }

    /**
     * Get user by ID
     */
    async findOne(id: string): Promise<Users> {
        const user = await this.usersRepository.findOne({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return user;
    }

    /**
     * Get user by email
     */
    async findByEmail(email: string): Promise<Users> {
        const user = await this.usersRepository.findOne({
            where: { email },
        });

        if (!user) {
            throw new NotFoundException(`User with email ${email} not found`);
        }

        return user;
    }

    /**
     * Get current user profile
     */
    async getProfile(userId: string): Promise<Partial<Users>> {
        const user = await this.findOne(userId);

        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.avatarUrl,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }

    /**
     * Update user profile
     */
    async updateProfile(
        userId: string,
        updateUserDto: UpdateUserDto,
    ): Promise<Users> {
        const user = await this.findOne(userId);

        Object.assign(user, updateUserDto);
        const updatedUser = await this.usersRepository.save(user);

        this.logger.log(`Updated profile for user ${userId}`);

        return updatedUser;
    }

    /**
     * Get user's organizations
     */
    async getUserOrganizations(userId: string): Promise<any[]> {
        const memberships = await this.membershipsRepository.find({
            where: { userId },
            relations: ['organization'],
            order: { joinedAt: 'ASC' },
        });

        return memberships.map(membership => ({
            id: membership.organizationId,
            name: membership.organization.name,
            slug: membership.organization.slug,
            role: membership.role,
            joinedAt: membership.joinedAt,
        }));
    }

    /**
     * Get user's memberships
     */
    async getUserMemberships(userId: string): Promise<any[]> {
        const memberships = await this.membershipsRepository.find({
            where: { userId },
            relations: ['organization'],
            order: { joinedAt: 'ASC' },
        });

        return memberships.map(membership => ({
            id: membership.id,
            organizationId: membership.organizationId,
            organizationName: membership.organization.name,
            organizationSlug: membership.organization.slug,
            role: membership.role,
            joinedAt: membership.joinedAt,
            invitedAt: membership.invitedAt,
        }));
    }

    /**
     * Check if email is available
     */
    async isEmailAvailable(email: string, excludeUserId?: string): Promise<boolean> {
        const query = this.usersRepository.createQueryBuilder('user')
            .where('user.email = :email', { email });

        if (excludeUserId) {
            query.andWhere('user.id != :excludeUserId', { excludeUserId });
        }

        const count = await query.getCount();
        return count === 0;
    }

    /**
     * Update user's email verification status
     */
    async updateEmailVerification(userId: string, verified: boolean): Promise<Users> {
        const user = await this.findOne(userId);
        user.emailVerified = verified;
        return this.usersRepository.save(user);
    }

    /**
     * Delete user account
     */
    async deleteAccount(userId: string): Promise<void> {
        const user = await this.findOne(userId);

        // Check if user is the only owner of any organizations
        const ownerMemberships = await this.membershipsRepository.find({
            where: { userId, role: 'owner' },
        });

        for (const membership of ownerMemberships) {
            const orgMemberships = await this.membershipsRepository.find({
                where: { organizationId: membership.organizationId },
            });

            if (orgMemberships.length === 1) {
                throw new ConflictException(
                    'Cannot delete account. You are the only owner of an organization. ' +
                    'Transfer ownership or delete the organization first.',
                );
            }
        }

        // Remove all memberships
        await this.membershipsRepository.delete({ userId });

        // Delete user
        await this.usersRepository.remove(user);

        this.logger.log(`Deleted user account ${userId}`);
    }

    /**
     * Search users by email or name
     */
    async searchUsers(query: string, organizationId?: string): Promise<Partial<Users>[]> {
        const qb = this.usersRepository.createQueryBuilder('user')
            .select(['user.id', 'user.email', 'user.firstName', 'user.lastName', 'user.avatarUrl'])
            .where('user.email ILIKE :query OR user.firstName ILIKE :query OR user.lastName ILIKE :query', {
                query: `%${query}%`,
            });

        if (organizationId) {
            qb.innerJoin('user.memberships', 'membership', 'membership.organizationId = :organizationId', {
                organizationId,
            });
        }

        const users = await qb.limit(20).getMany();

        return users.map(user => ({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.avatarUrl,
        }));
    }

    /**
     * Get user statistics
     */
    async getUserStats(userId: string): Promise<any> {
        const memberships = await this.membershipsRepository.find({
            where: { userId },
        });

        const organizationsCount = memberships.length;
        const ownedOrganizations = memberships.filter(m => m.role === 'owner').length;

        return {
            organizationsCount,
            ownedOrganizations,
            roles: {
                owner: memberships.filter(m => m.role === 'owner').length,
                admin: memberships.filter(m => m.role === 'admin').length,
                editor: memberships.filter(m => m.role === 'editor').length,
                viewer: memberships.filter(m => m.role === 'viewer').length,
            },
        };
    }
}
