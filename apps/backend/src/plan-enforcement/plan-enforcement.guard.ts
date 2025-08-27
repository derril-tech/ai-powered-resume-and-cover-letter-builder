# Created automatically by Cursor AI(2024 - 12 - 19)

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanEnforcementService } from './plan-enforcement.service';

export interface PlanLimitMetadata {
    operation: 'export' | 'optimization' | 'cover_letter' | 'api_call' | 'storage';
    amount?: number;
    orgIdParam?: string;
}

export const PLAN_LIMIT_KEY = 'planLimit';

export const PlanLimit = (metadata: PlanLimitMetadata) => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(PLAN_LIMIT_KEY, metadata, descriptor.value);
        return descriptor;
    };
};

@Injectable()
export class PlanEnforcementGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private planEnforcementService: PlanEnforcementService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const planLimitMetadata = this.reflector.get<PlanLimitMetadata>(
            PLAN_LIMIT_KEY,
            context.getHandler()
        );

        if (!planLimitMetadata) {
            return true; // No plan limit metadata, allow access
        }

        const request = context.switchToHttp().getRequest();
        const { operation, amount = 1, orgIdParam = 'orgId' } = planLimitMetadata;

        // Extract orgId from request params or body
        let orgId: string;
        if (request.params[orgIdParam]) {
            orgId = request.params[orgIdParam];
        } else if (request.body && request.body.orgId) {
            orgId = request.body.orgId;
        } else {
            // Try to get orgId from user context if available
            const user = request.user;
            if (user && user.orgId) {
                orgId = user.orgId;
            } else {
                throw new ForbiddenException('Organization ID not found in request');
            }
        }

        // Enforce plan limits
        await this.planEnforcementService.enforcePlanLimits(orgId, operation, amount);

        return true;
    }
}
