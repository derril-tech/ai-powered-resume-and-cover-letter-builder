# Created automatically by Cursor AI(2024 - 12 - 19)

import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanEnforcementEntity } from '../entities/plan_enforcement.entity';
import { BillingService } from '../billing/billing.service';
import { OrganizationService } from '../organizations/organizations.service';
import { UserService } from '../users/users.service';

export interface PlanEnforcementResult {
    allowed: boolean;
    reason?: string;
    overageAmount?: number;
    overageCost?: number;
    currentUsage: {
        seats: number;
        exports: number;
        optimizations: number;
        cover_letters: number;
        api_calls: number;
        storage_gb: number;
    };
    limits: {
        seats: number;
        exports: number;
        optimizations: number;
        cover_letters: number;
        api_calls: number;
        storage_gb: number;
    };
}

@Injectable()
export class PlanEnforcementService {
    constructor(
        @InjectRepository(PlanEnforcementEntity)
        private readonly planEnforcementRepo: Repository<PlanEnforcementEntity>,
        private readonly billingService: BillingService,
        private readonly organizationService: OrganizationService,
        private readonly userService: UserService
    ) { }

    async checkSeatLimit(orgId: string): Promise<PlanEnforcementResult> {
        const plan = await this.getPlanEnforcement(orgId);
        const currentSeats = await this.userService.getActiveUserCount(orgId);

        const result: PlanEnforcementResult = {
            allowed: true,
            currentUsage: { seats: currentSeats, exports: 0, optimizations: 0, cover_letters: 0, api_calls: 0, storage_gb: 0 },
            limits: { seats: plan.limits.seats, exports: 0, optimizations: 0, cover_letters: 0, api_calls: 0, storage_gb: 0 }
        };

        if (plan.enforceSeatLimit && currentSeats >= plan.limits.seats) {
            result.allowed = false;
            result.reason = `Seat limit exceeded. Current: ${currentSeats}, Limit: ${plan.limits.seats}`;

            if (plan.allowOverage) {
                result.overageAmount = currentSeats - plan.limits.seats;
                result.overageCost = result.overageAmount * plan.overageRates.seats;
                result.allowed = true; // Allow with overage charges
            }
        }

        return result;
    }

    async checkUsageLimit(
        orgId: string,
        operation: 'export' | 'optimization' | 'cover_letter' | 'api_call' | 'storage',
        amount: number = 1
    ): Promise<PlanEnforcementResult> {
        const plan = await this.getPlanEnforcement(orgId);
        const currentSeats = await this.userService.getActiveUserCount(orgId);

        // Get current usage for the relevant period
        const period = this.getCurrentPeriod();
        const currentUsage = await this.billingService.getUsageStats(orgId, period);

        const result: PlanEnforcementResult = {
            allowed: true,
            currentUsage: {
                seats: currentSeats,
                exports: currentUsage.exports || 0,
                optimizations: currentUsage.optimizations || 0,
                cover_letters: currentUsage.cover_letters || 0,
                api_calls: currentUsage.api_calls || 0,
                storage_gb: currentUsage.storage_gb || 0
            },
            limits: {
                seats: plan.limits.seats,
                exports: plan.limits.exports[period],
                optimizations: plan.limits.optimizations[period],
                cover_letters: plan.limits.cover_letters[period],
                api_calls: plan.limits.api_calls[period],
                storage_gb: plan.limits.storage_gb
            }
        };

        if (!plan.enforceUsageLimit) {
            return result;
        }

        // Check specific operation limit
        const operationKey = operation === 'api_call' ? 'api_calls' : `${operation}s`;
        const currentCount = result.currentUsage[operationKey as keyof typeof result.currentUsage] as number;
        const limit = result.limits[operationKey as keyof typeof result.limits] as number;

        if (currentCount + amount > limit) {
            result.allowed = false;
            result.reason = `${operation} limit exceeded. Current: ${currentCount}, Requested: ${amount}, Limit: ${limit}`;

            if (plan.allowOverage) {
                result.overageAmount = (currentCount + amount) - limit;
                result.overageCost = result.overageAmount * plan.overageRates[operationKey as keyof typeof plan.overageRates];
                result.allowed = true; // Allow with overage charges
            }
        }

        return result;
    }

    async enforcePlanLimits(
        orgId: string,
        operation: 'export' | 'optimization' | 'cover_letter' | 'api_call' | 'storage',
        amount: number = 1
    ): Promise<void> {
        // Check seat limit first
        const seatCheck = await this.checkSeatLimit(orgId);
        if (!seatCheck.allowed) {
            throw new ForbiddenException(seatCheck.reason);
        }

        // Check usage limit
        const usageCheck = await this.checkUsageLimit(orgId, operation, amount);
        if (!usageCheck.allowed) {
            throw new ForbiddenException(usageCheck.reason);
        }

        // If overage is allowed, track the overage charges
        if (usageCheck.overageAmount && usageCheck.overageCost) {
            await this.trackOverageCharges(orgId, operation, usageCheck.overageAmount, usageCheck.overageCost);
        }
    }

    async createPlanEnforcement(
        orgId: string,
        planType: 'free' | 'starter' | 'professional' | 'enterprise',
        enforceSeatLimit: boolean = true,
        enforceUsageLimit: boolean = true,
        allowOverage: boolean = false,
        planExpiresAt?: Date
    ): Promise<PlanEnforcementEntity> {
        const limits = this.getPlanLimits(planType);
        const overageRates = this.getPlanOverageRates(planType);

        const planEnforcement = this.planEnforcementRepo.create({
            orgId,
            planType,
            limits,
            overageRates,
            enforceSeatLimit,
            enforceUsageLimit,
            allowOverage,
            planExpiresAt
        });

        return this.planEnforcementRepo.save(planEnforcement);
    }

    async updatePlanEnforcement(
        orgId: string,
        updates: Partial<PlanEnforcementEntity>
    ): Promise<PlanEnforcementEntity> {
        const plan = await this.getPlanEnforcement(orgId);
        Object.assign(plan, updates);
        return this.planEnforcementRepo.save(plan);
    }

    async getPlanEnforcement(orgId: string): Promise<PlanEnforcementEntity> {
        const plan = await this.planEnforcementRepo.findOne({ where: { orgId } });
        if (!plan) {
            throw new BadRequestException(`No plan enforcement found for organization ${orgId}`);
        }
        return plan;
    }

    async isFeatureEnabled(orgId: string, feature: string): Promise<boolean> {
        const plan = await this.getPlanEnforcement(orgId);
        return plan.limits.features.includes(feature);
    }

    private getCurrentPeriod(): 'daily' | 'monthly' | 'yearly' {
        // For now, default to monthly - could be made configurable
        return 'monthly';
    }

    private getPlanLimits(planType: string) {
        const limits = {
            free: {
                seats: 1,
                exports: { daily: 5, monthly: 50, yearly: 500 },
                optimizations: { daily: 10, monthly: 100, yearly: 1000 },
                cover_letters: { daily: 3, monthly: 30, yearly: 300 },
                api_calls: { daily: 100, monthly: 1000, yearly: 10000 },
                storage_gb: 1,
                features: ['basic_optimization', 'pdf_export']
            },
            starter: {
                seats: 5,
                exports: { daily: 20, monthly: 200, yearly: 2000 },
                optimizations: { daily: 50, monthly: 500, yearly: 5000 },
                cover_letters: { daily: 10, monthly: 100, yearly: 1000 },
                api_calls: { daily: 500, monthly: 5000, yearly: 50000 },
                storage_gb: 10,
                features: ['basic_optimization', 'advanced_optimization', 'pdf_export', 'docx_export', 'ats_check']
            },
            professional: {
                seats: 25,
                exports: { daily: 100, monthly: 1000, yearly: 10000 },
                optimizations: { daily: 250, monthly: 2500, yearly: 25000 },
                cover_letters: { daily: 50, monthly: 500, yearly: 5000 },
                api_calls: { daily: 2500, monthly: 25000, yearly: 250000 },
                storage_gb: 100,
                features: ['basic_optimization', 'advanced_optimization', 'pdf_export', 'docx_export', 'ats_check', 'collaboration', 'versioning', 'compliance_mode']
            },
            enterprise: {
                seats: 1000,
                exports: { daily: 1000, monthly: 10000, yearly: 100000 },
                optimizations: { daily: 2500, monthly: 25000, yearly: 250000 },
                cover_letters: { daily: 500, monthly: 5000, yearly: 50000 },
                api_calls: { daily: 25000, monthly: 250000, yearly: 2500000 },
                storage_gb: 1000,
                features: ['basic_optimization', 'advanced_optimization', 'pdf_export', 'docx_export', 'ats_check', 'collaboration', 'versioning', 'compliance_mode', 'sso', 'scim', 'audit_logs', 'api_access']
            }
        };

        return limits[planType as keyof typeof limits] || limits.free;
    }

    private getPlanOverageRates(planType: string) {
        const rates = {
            free: { exports: 0.10, optimizations: 0.05, cover_letters: 0.15, api_calls: 0.001, storage_gb: 0.50, seats: 10.00 },
            starter: { exports: 0.08, optimizations: 0.04, cover_letters: 0.12, api_calls: 0.0008, storage_gb: 0.40, seats: 8.00 },
            professional: { exports: 0.06, optimizations: 0.03, cover_letters: 0.10, api_calls: 0.0006, storage_gb: 0.30, seats: 6.00 },
            enterprise: { exports: 0.04, optimizations: 0.02, cover_letters: 0.08, api_calls: 0.0004, storage_gb: 0.20, seats: 4.00 }
        };

        return rates[planType as keyof typeof rates] || rates.free;
    }

    private async trackOverageCharges(
        orgId: string,
        operation: string,
        overageAmount: number,
        overageCost: number
    ): Promise<void> {
        // This would integrate with your billing system to track overage charges
        // For now, we'll just log it
        console.log(`Overage charge for ${orgId}: ${operation} - ${overageAmount} units, $${overageCost}`);
    }
}
