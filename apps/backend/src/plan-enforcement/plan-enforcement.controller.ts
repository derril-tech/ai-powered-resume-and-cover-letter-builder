# Created automatically by Cursor AI(2024 - 12 - 19)

import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlanEnforcementService, PlanEnforcementResult } from './plan-enforcement.service';
import { PlanEnforcementEntity } from '../entities/plan_enforcement.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

export class CreatePlanEnforcementDto {
    planType!: 'free' | 'starter' | 'professional' | 'enterprise';
    enforceSeatLimit?: boolean;
    enforceUsageLimit?: boolean;
    allowOverage?: boolean;
    planExpiresAt?: Date;
}

export class UpdatePlanEnforcementDto {
    planType?: 'free' | 'starter' | 'professional' | 'enterprise';
    enforceSeatLimit?: boolean;
    enforceUsageLimit?: boolean;
    allowOverage?: boolean;
    planExpiresAt?: Date;
}

export class CheckLimitDto {
    operation!: 'export' | 'optimization' | 'cover_letter' | 'api_call' | 'storage';
    amount?: number;
}

@ApiTags('Plan Enforcement')
@Controller('plan-enforcement')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PlanEnforcementController {
    constructor(private readonly planEnforcementService: PlanEnforcementService) { }

    @Post(':orgId')
    @Roles('owner', 'admin')
    @ApiOperation({ summary: 'Create plan enforcement for organization' })
    @ApiResponse({ status: 201, description: 'Plan enforcement created successfully' })
    async createPlanEnforcement(
        @Param('orgId') orgId: string,
        @Body() createDto: CreatePlanEnforcementDto
    ): Promise<PlanEnforcementEntity> {
        return this.planEnforcementService.createPlanEnforcement(
            orgId,
            createDto.planType,
            createDto.enforceSeatLimit ?? true,
            createDto.enforceUsageLimit ?? true,
            createDto.allowOverage ?? false,
            createDto.planExpiresAt
        );
    }

    @Get(':orgId')
    @Roles('owner', 'admin')
    @ApiOperation({ summary: 'Get plan enforcement for organization' })
    @ApiResponse({ status: 200, description: 'Plan enforcement retrieved successfully' })
    async getPlanEnforcement(@Param('orgId') orgId: string): Promise<PlanEnforcementEntity> {
        return this.planEnforcementService.getPlanEnforcement(orgId);
    }

    @Put(':orgId')
    @Roles('owner', 'admin')
    @ApiOperation({ summary: 'Update plan enforcement for organization' })
    @ApiResponse({ status: 200, description: 'Plan enforcement updated successfully' })
    async updatePlanEnforcement(
        @Param('orgId') orgId: string,
        @Body() updateDto: UpdatePlanEnforcementDto
    ): Promise<PlanEnforcementEntity> {
        return this.planEnforcementService.updatePlanEnforcement(orgId, updateDto);
    }

    @Get(':orgId/check-seat-limit')
    @Roles('owner', 'admin')
    @ApiOperation({ summary: 'Check seat limit for organization' })
    @ApiResponse({ status: 200, description: 'Seat limit check completed' })
    async checkSeatLimit(@Param('orgId') orgId: string): Promise<PlanEnforcementResult> {
        return this.planEnforcementService.checkSeatLimit(orgId);
    }

    @Post(':orgId/check-usage-limit')
    @Roles('owner', 'admin')
    @ApiOperation({ summary: 'Check usage limit for specific operation' })
    @ApiResponse({ status: 200, description: 'Usage limit check completed' })
    async checkUsageLimit(
        @Param('orgId') orgId: string,
        @Body() checkDto: CheckLimitDto
    ): Promise<PlanEnforcementResult> {
        return this.planEnforcementService.checkUsageLimit(
            orgId,
            checkDto.operation,
            checkDto.amount ?? 1
        );
    }

    @Get(':orgId/feature/:feature')
    @Roles('owner', 'admin', 'editor', 'viewer')
    @ApiOperation({ summary: 'Check if feature is enabled for organization' })
    @ApiResponse({ status: 200, description: 'Feature check completed' })
    async isFeatureEnabled(
        @Param('orgId') orgId: string,
        @Param('feature') feature: string
    ): Promise<{ enabled: boolean }> {
        const enabled = await this.planEnforcementService.isFeatureEnabled(orgId, feature);
        return { enabled };
    }

    @Post(':orgId/enforce/:operation')
    @Roles('owner', 'admin', 'editor', 'viewer')
    @ApiOperation({ summary: 'Enforce plan limits for operation' })
    @ApiResponse({ status: 200, description: 'Plan limits enforced successfully' })
    async enforcePlanLimits(
        @Param('orgId') orgId: string,
        @Param('operation') operation: 'export' | 'optimization' | 'cover_letter' | 'api_call' | 'storage',
        @Body() checkDto: CheckLimitDto
    ): Promise<{ success: boolean }> {
        await this.planEnforcementService.enforcePlanLimits(
            orgId,
            operation,
            checkDto.amount ?? 1
        );
        return { success: true };
    }
}
