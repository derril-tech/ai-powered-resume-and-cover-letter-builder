import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingCounterEntity } from '../entities/billing_counter.entity';
import { OrganizationService } from '../organizations/organizations.service';

@Injectable()
export class BillingService {
    constructor(
        @InjectRepository(BillingCounterEntity)
        private readonly billingCounterRepo: Repository<BillingCounterEntity>,
        private readonly organizationService: OrganizationService
    ) { }

    async incrementCounter(
        orgId: string,
        counterType: 'exports' | 'optimizations' | 'cover_letters' | 'api_calls' | 'storage_gb' | 'users',
        amount: number = 1,
        breakdown?: Record<string, any>
    ): Promise<BillingCounterEntity> {
        const period = this.getCurrentPeriod();
        const counter = await this.getOrCreateCounter(orgId, counterType, period);

        // Check if increment would exceed limit
        const newCount = counter.currentCount + amount;
        if (newCount > counter.limit) {
            throw new ForbiddenException(`Usage limit exceeded for ${counterType}. Current: ${counter.currentCount}, Limit: ${counter.limit}`);
        }

        // Update counter
        counter.currentCount = newCount;
        counter.updatedAt = new Date();

        // Update breakdown if provided
        if (breakdown) {
            counter.breakdown = {
                ...counter.breakdown,
                ...breakdown
            };
        }

        return this.billingCounterRepo.save(counter);
    }

    async getCounter(
        orgId: string,
        counterType: 'exports' | 'optimizations' | 'cover_letters' | 'api_calls' | 'storage_gb' | 'users',
        period: 'daily' | 'monthly' | 'yearly' = 'monthly'
    ): Promise<BillingCounterEntity | null> {
        const periodDates = this.getPeriodDates(period);

        return this.billingCounterRepo.findOne({
            where: {
                orgId,
                counterType,
                period,
                periodStart: periodDates.start,
                periodEnd: periodDates.end
            }
        });
    }

    async getUsageStats(orgId: string, period: 'daily' | 'monthly' | 'yearly' = 'monthly'): Promise<{
        exports: BillingCounterEntity | null;
        optimizations: BillingCounterEntity | null;
        cover_letters: BillingCounterEntity | null;
        api_calls: BillingCounterEntity | null;
        storage_gb: BillingCounterEntity | null;
        users: BillingCounterEntity | null;
    }> {
        const periodDates = this.getPeriodDates(period);

        const counters = await this.billingCounterRepo.find({
            where: {
                orgId,
                period,
                periodStart: periodDates.start,
                periodEnd: periodDates.end
            }
        });

        const stats = {
            exports: null,
            optimizations: null,
            cover_letters: null,
            api_calls: null,
            storage_gb: null,
            users: null
        };

        counters.forEach(counter => {
            stats[counter.counterType] = counter;
        });

        return stats;
    }

    async checkUsageLimit(
        orgId: string,
        counterType: 'exports' | 'optimizations' | 'cover_letters' | 'api_calls' | 'storage_gb' | 'users',
        amount: number = 1
    ): Promise<{ allowed: boolean; current: number; limit: number; remaining: number }> {
        const counter = await this.getCounter(orgId, counterType);

        if (!counter) {
            // No counter exists, check organization plan limits
            const org = await this.organizationService.get(orgId);
            const planLimits = this.getPlanLimits(org.plan);
            const limit = planLimits[counterType] || 0;

            return {
                allowed: amount <= limit,
                current: 0,
                limit,
                remaining: limit
            };
        }

        const remaining = Math.max(0, counter.limit - counter.currentCount);
        const allowed = amount <= remaining;

        return {
            allowed,
            current: counter.currentCount,
            limit: counter.limit,
            remaining
        };
    }

    async resetCounters(orgId: string, period: 'daily' | 'monthly' | 'yearly'): Promise<void> {
        const periodDates = this.getPeriodDates(period);

        await this.billingCounterRepo.update(
            {
                orgId,
                period,
                periodStart: periodDates.start,
                periodEnd: periodDates.end
            },
            {
                currentCount: 0,
                breakdown: {},
                metadata: {
                    lastResetAt: new Date()
                }
            }
        );
    }

    async getOverageCharges(orgId: string, period: 'daily' | 'monthly' | 'yearly' = 'monthly'): Promise<{
        totalCharges: number;
        breakdown: Record<string, { overage: number; rate: number; charges: number }>;
    }> {
        const stats = await this.getUsageStats(orgId, period);
        const org = await this.organizationService.get(orgId);
        const planRates = this.getPlanRates(org.plan);

        let totalCharges = 0;
        const breakdown: Record<string, { overage: number; rate: number; charges: number }> = {};

        Object.entries(stats).forEach(([type, counter]) => {
            if (counter && counter.currentCount > counter.limit) {
                const overage = counter.currentCount - counter.limit;
                const rate = planRates[type as keyof typeof planRates] || 0;
                const charges = overage * rate;

                breakdown[type] = { overage, rate, charges };
                totalCharges += charges;
            }
        });

        return { totalCharges, breakdown };
    }

    async exportUsageReport(
        orgId: string,
        startDate: Date,
        endDate: Date
    ): Promise<{
        period: string;
        totalUsage: Record<string, number>;
        breakdown: Record<string, any>;
        charges: number;
    }> {
        const counters = await this.billingCounterRepo.find({
            where: {
                orgId,
                periodStart: startDate,
                periodEnd: endDate
            }
        });

        const totalUsage: Record<string, number> = {};
        const breakdown: Record<string, any> = {};
        let totalCharges = 0;

        counters.forEach(counter => {
            totalUsage[counter.counterType] = (totalUsage[counter.counterType] || 0) + counter.currentCount;
            breakdown[counter.counterType] = counter.breakdown;

            if (counter.currentCount > counter.limit) {
                const overage = counter.currentCount - counter.limit;
                const org = await this.organizationService.get(orgId);
                const planRates = this.getPlanRates(org.plan);
                const rate = planRates[counter.counterType as keyof typeof planRates] || 0;
                totalCharges += overage * rate;
            }
        });

        return {
            period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
            totalUsage,
            breakdown,
            charges: totalCharges
        };
    }

    private async getOrCreateCounter(
        orgId: string,
        counterType: 'exports' | 'optimizations' | 'cover_letters' | 'api_calls' | 'storage_gb' | 'users',
        period: { start: Date; end: Date }
    ): Promise<BillingCounterEntity> {
        let counter = await this.billingCounterRepo.findOne({
            where: {
                orgId,
                counterType,
                periodStart: period.start,
                periodEnd: period.end
            }
        });

        if (!counter) {
            const org = await this.organizationService.get(orgId);
            const planLimits = this.getPlanLimits(org.plan);

            counter = this.billingCounterRepo.create({
                orgId,
                counterType,
                period: this.getCurrentPeriod(),
                periodStart: period.start,
                periodEnd: period.end,
                currentCount: 0,
                limit: planLimits[counterType] || 0,
                breakdown: {},
                metadata: {
                    lastResetAt: new Date(),
                    resetFrequency: this.getCurrentPeriod()
                }
            });
        }

        return counter;
    }

    private getCurrentPeriod(): 'daily' | 'monthly' | 'yearly' {
        return 'monthly'; // Default to monthly billing
    }

    private getPeriodDates(period: 'daily' | 'monthly' | 'yearly'): { start: Date; end: Date } {
        const now = new Date();

        switch (period) {
            case 'daily':
                const startOfDay = new Date(now);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(now);
                endOfDay.setHours(23, 59, 59, 999);
                return { start: startOfDay, end: endOfDay };

            case 'monthly':
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                return { start: startOfMonth, end: endOfMonth };

            case 'yearly':
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                return { start: startOfYear, end: endOfYear };

            default:
                throw new BadRequestException('Invalid period');
        }
    }

    private getPlanLimits(plan: string): Record<string, number> {
        const limits = {
            free: {
                exports: 10,
                optimizations: 5,
                cover_letters: 3,
                api_calls: 100,
                storage_gb: 1,
                users: 3
            },
            starter: {
                exports: 100,
                optimizations: 50,
                cover_letters: 25,
                api_calls: 1000,
                storage_gb: 10,
                users: 10
            },
            professional: {
                exports: 500,
                optimizations: 250,
                cover_letters: 100,
                api_calls: 5000,
                storage_gb: 50,
                users: 25
            },
            premium: {
                exports: 2000,
                optimizations: 1000,
                cover_letters: 500,
                api_calls: 20000,
                storage_gb: 200,
                users: 100
            },
            enterprise: {
                exports: 10000,
                optimizations: 5000,
                cover_letters: 2500,
                api_calls: 100000,
                storage_gb: 1000,
                users: 500
            }
        };

        return limits[plan as keyof typeof limits] || limits.free;
    }

    private getPlanRates(plan: string): Record<string, number> {
        const rates = {
            free: {
                exports: 0.50,
                optimizations: 1.00,
                cover_letters: 2.00,
                api_calls: 0.01,
                storage_gb: 0.10,
                users: 5.00
            },
            starter: {
                exports: 0.25,
                optimizations: 0.50,
                cover_letters: 1.00,
                api_calls: 0.005,
                storage_gb: 0.05,
                users: 2.50
            },
            professional: {
                exports: 0.15,
                optimizations: 0.30,
                cover_letters: 0.75,
                api_calls: 0.003,
                storage_gb: 0.03,
                users: 1.50
            },
            premium: {
                exports: 0.10,
                optimizations: 0.20,
                cover_letters: 0.50,
                api_calls: 0.002,
                storage_gb: 0.02,
                users: 1.00
            },
            enterprise: {
                exports: 0.05,
                optimizations: 0.10,
                cover_letters: 0.25,
                api_calls: 0.001,
                storage_gb: 0.01,
                users: 0.50
            }
        };

        return rates[plan as keyof typeof rates] || rates.free;
    }

    async trackExport(orgId: string, format: 'pdf' | 'docx' | 'markdown' | 'email'): Promise<void> {
        await this.incrementCounter(orgId, 'exports', 1, {
            exports: {
                [format]: 1
            }
        });
    }

    async trackOptimization(orgId: string, type: 'basic' | 'advanced' | 'ats_optimized'): Promise<void> {
        await this.incrementCounter(orgId, 'optimizations', 1, {
            optimizations: {
                [type]: 1
            }
        });
    }

    async trackCoverLetter(orgId: string, action: 'generated' | 'exported'): Promise<void> {
        await this.incrementCounter(orgId, 'cover_letters', 1, {
            cover_letters: {
                [action]: 1
            }
        });
    }

    async trackApiCall(orgId: string, endpoint: 'resume_parse' | 'jd_parse' | 'optimize' | 'export'): Promise<void> {
        await this.incrementCounter(orgId, 'api_calls', 1, {
            api_calls: {
                [endpoint]: 1
            }
        });
    }

    async trackStorage(orgId: string, type: 'resumes' | 'exports' | 'attachments', sizeInBytes: number): Promise<void> {
        const sizeInGB = sizeInBytes / (1024 * 1024 * 1024);
        await this.incrementCounter(orgId, 'storage_gb', sizeInGB, {
            storage: {
                [type]: sizeInGB
            }
        });
    }

    async trackUser(orgId: string): Promise<void> {
        await this.incrementCounter(orgId, 'users', 1);
    }
}
