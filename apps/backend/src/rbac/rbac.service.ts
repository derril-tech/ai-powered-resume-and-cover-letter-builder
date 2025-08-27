import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { newEnforcer, Enforcer, newModelFromString } from 'casbin';
import TypeORMAdapter from '@casbin/typeorm-adapter';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface PermissionCheck {
    userId: string;
    resource: string;
    action: string;
    organizationId?: string;
}

export interface RoleAssignment {
    userId: string;
    role: string;
    organizationId?: string;
}

@Injectable()
export class RbacService implements OnModuleInit {
    private enforcer: Enforcer;
    private readonly logger = new Logger(RbacService.name);

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }

    async onModuleInit() {
        await this.initializeCasbin();
    }

    private async initializeCasbin(): Promise<void> {
        try {
            // Create TypeORM adapter
            const adapter = await TypeORMAdapter.newAdapter({
                type: 'postgres',
                host: process.env.DATABASE_HOST || 'localhost',
                port: parseInt(process.env.DATABASE_PORT || '5432'),
                username: process.env.DATABASE_USER || 'postgres',
                password: process.env.DATABASE_PASSWORD || 'postgres',
                database: process.env.DATABASE_NAME || 'resume_builder',
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
                synchronize: false, // Don't let Casbin create tables
            }, 'casbin_policies');

            // Load model from file
            const modelPath = join(__dirname, 'casbin.model.conf');
            const modelText = readFileSync(modelPath, 'utf8');
            const model = newModelFromString(modelText);

            // Create enforcer
            this.enforcer = await newEnforcer(model, adapter);

            // Load policies
            await this.enforcer.loadPolicy();

            this.logger.log('Casbin RBAC initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Casbin RBAC:', error);
            throw error;
        }
    }

    /**
     * Check if a user has permission to perform an action on a resource
     */
    async hasPermission(check: PermissionCheck): Promise<boolean> {
        try {
            // Format subject as "user:{userId}" or "role:{role}@{organizationId}"
            const subject = check.organizationId
                ? `user:${check.userId}@${check.organizationId}`
                : `user:${check.userId}`;

            const object = check.resource;
            const action = check.action;

            const allowed = await this.enforcer.enforce(subject, object, action);
            return allowed;
        } catch (error) {
            this.logger.error(`Permission check failed:`, error);
            return false;
        }
    }

    /**
     * Assign a role to a user
     */
    async assignRole(assignment: RoleAssignment): Promise<boolean> {
        try {
            const user = assignment.organizationId
                ? `user:${assignment.userId}@${assignment.organizationId}`
                : `user:${assignment.userId}`;

            const role = assignment.role;

            const success = await this.enforcer.addRoleForUser(user, role);
            if (success) {
                await this.enforcer.savePolicy();
                this.logger.log(`Assigned role ${role} to user ${user}`);
            }
            return success;
        } catch (error) {
            this.logger.error(`Failed to assign role:`, error);
            return false;
        }
    }

    /**
     * Remove a role from a user
     */
    async revokeRole(assignment: RoleAssignment): Promise<boolean> {
        try {
            const user = assignment.organizationId
                ? `user:${assignment.userId}@${assignment.organizationId}`
                : `user:${assignment.userId}`;

            const role = assignment.role;

            const success = await this.enforcer.deleteRoleForUser(user, role);
            if (success) {
                await this.enforcer.savePolicy();
                this.logger.log(`Revoked role ${role} from user ${user}`);
            }
            return success;
        } catch (error) {
            this.logger.error(`Failed to revoke role:`, error);
            return false;
        }
    }

    /**
     * Get all roles for a user
     */
    async getUserRoles(userId: string, organizationId?: string): Promise<string[]> {
        try {
            const user = organizationId
                ? `user:${userId}@${organizationId}`
                : `user:${userId}`;

            const roles = await this.enforcer.getRolesForUser(user);
            return roles;
        } catch (error) {
            this.logger.error(`Failed to get user roles:`, error);
            return [];
        }
    }

    /**
     * Get all users with a specific role
     */
    async getUsersWithRole(role: string, organizationId?: string): Promise<string[]> {
        try {
            const users = await this.enforcer.getUsersForRole(role);
            if (organizationId) {
                return users
                    .filter(user => user.includes(`@${organizationId}`))
                    .map(user => user.replace(`user:`, '').replace(`@${organizationId}`, ''));
            }
            return users
                .filter(user => !user.includes('@'))
                .map(user => user.replace('user:', ''));
        } catch (error) {
            this.logger.error(`Failed to get users with role:`, error);
            return [];
        }
    }

    /**
     * Add a new policy
     */
    async addPolicy(subject: string, object: string, action: string): Promise<boolean> {
        try {
            const success = await this.enforcer.addPolicy(subject, object, action);
            if (success) {
                await this.enforcer.savePolicy();
                this.logger.log(`Added policy: ${subject}, ${object}, ${action}`);
            }
            return success;
        } catch (error) {
            this.logger.error(`Failed to add policy:`, error);
            return false;
        }
    }

    /**
     * Remove a policy
     */
    async removePolicy(subject: string, object: string, action: string): Promise<boolean> {
        try {
            const success = await this.enforcer.removePolicy(subject, object, action);
            if (success) {
                await this.enforcer.savePolicy();
                this.logger.log(`Removed policy: ${subject}, ${object}, ${action}`);
            }
            return success;
        } catch (error) {
            this.logger.error(`Failed to remove policy:`, error);
            return false;
        }
    }

    /**
     * Get all policies
     */
    async getAllPolicies(): Promise<string[][]> {
        try {
            return await this.enforcer.getPolicy();
        } catch (error) {
            this.logger.error(`Failed to get policies:`, error);
            return [];
        }
    }

    /**
     * Clear all policies
     */
    async clearPolicies(): Promise<void> {
        try {
            await this.enforcer.clearPolicy();
            await this.enforcer.savePolicy();
            this.logger.log('Cleared all policies');
        } catch (error) {
            this.logger.error(`Failed to clear policies:`, error);
        }
    }

    /**
     * Reload policies from storage
     */
    async reloadPolicies(): Promise<void> {
        try {
            await this.enforcer.loadPolicy();
            this.logger.log('Reloaded policies from storage');
        } catch (error) {
            this.logger.error(`Failed to reload policies:`, error);
        }
    }

    get enforcer(): Enforcer {
        return this.enforcer;
    }
}
