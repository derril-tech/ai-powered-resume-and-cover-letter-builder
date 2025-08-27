import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../rbac.service';

export interface RbacMetadata {
    resource: string;
    action: string;
    organizationId?: string;
}

@Injectable()
export class RbacGuard implements CanActivate {
    private readonly logger = new Logger(RbacGuard.name);

    constructor(
        private readonly rbacService: RbacService,
        private readonly reflector: Reflector,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const rbacMetadata = this.reflector.get<RbacMetadata>(
            'rbac',
            context.getHandler(),
        );

        if (!rbacMetadata) {
            // No RBAC metadata, allow access
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.id) {
            this.logger.warn('RBAC guard triggered but no user found in request');
            throw new ForbiddenException('Authentication required');
        }

        // Extract organization ID from request
        const organizationId = this.extractOrganizationId(request, rbacMetadata);

        const permissionCheck = {
            userId: user.id,
            resource: rbacMetadata.resource,
            action: rbacMetadata.action,
            organizationId,
        };

        const hasPermission = await this.rbacService.hasPermission(permissionCheck);

        if (!hasPermission) {
            this.logger.warn(
                `Access denied for user ${user.id} to ${rbacMetadata.action} ${rbacMetadata.resource}`,
            );
            throw new ForbiddenException(
                `Insufficient permissions to ${rbacMetadata.action} ${rbacMetadata.resource}`,
            );
        }

        this.logger.debug(
            `Access granted for user ${user.id} to ${rbacMetadata.action} ${rbacMetadata.resource}`,
        );

        return true;
    }

    private extractOrganizationId(request: any, metadata: RbacMetadata): string | undefined {
        // Try to get organization ID from metadata first
        if (metadata.organizationId) {
            return metadata.organizationId;
        }

        // Try to extract from request parameters
        if (request.params?.organizationId) {
            return request.params.organizationId;
        }

        // Try to extract from request body
        if (request.body?.organizationId) {
            return request.body.organizationId;
        }

        // Try to extract from user object (if it contains organization context)
        if (request.user?.organizationId) {
            return request.user.organizationId;
        }

        // Try to extract from route parameters
        const orgId = request.params?.orgId || request.params?.org_id;
        if (orgId) {
            return orgId;
        }

        return undefined;
    }
}
