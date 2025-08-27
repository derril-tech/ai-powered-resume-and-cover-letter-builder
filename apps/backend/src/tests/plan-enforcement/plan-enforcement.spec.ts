# Created automatically by Cursor AI(2024 - 12 - 19)

import { Test, TestingModule } from '@nestjs/testing';
import { PlanEnforcementService } from '../../plan-enforcement/plan-enforcement.service';
import { BillingService } from '../../billing/billing.service';
import { OrganizationService } from '../../organizations/organizations.service';
import { UserService } from '../../users/users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlanEnforcementEntity } from '../../entities/plan_enforcement.entity';

describe('Plan Enforcement Service', () => {
    let service: PlanEnforcementService;
    let billingService: BillingService;
    let organizationService: OrganizationService;
    let userService: UserService;
    let planEnforcementRepo: any;

    const mockOrgId = 'test-org-id';

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PlanEnforcementService,
                {
                    provide: getRepositoryToken(PlanEnforcementEntity),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: BillingService,
                    useValue: {
                        getUsageStats: jest.fn(),
                        incrementCounter: jest.fn(),
                    },
                },
                {
                    provide: OrganizationService,
                    useValue: {
                        getOrganization: jest.fn(),
                    },
                },
                {
                    provide: UserService,
                    useValue: {
                        getActiveUserCount: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<PlanEnforcementService>(PlanEnforcementService);
        billingService = module.get<BillingService>(BillingService);
        organizationService = module.get<OrganizationService>(OrganizationService);
        userService = module.get<UserService>(UserService);
        planEnforcementRepo = module.get(getRepositoryToken(PlanEnforcementEntity));
    });

    describe('Plan Creation and Management', () => {
        it('should create plan enforcement for free tier', async () => {
            const planData = {
                orgId: mockOrgId,
                planType: 'free' as const,
                enforceSeatLimit: true,
                enforceUsageLimit: true,
                allowOverage: false,
            };

            const mockPlan = { id: 'plan-id', ...planData };
            planEnforcementRepo.create.mockReturnValue(mockPlan);
            planEnforcementRepo.save.mockResolvedValue(mockPlan);

            const result = await service.createPlanEnforcement(
                planData.orgId,
                planData.planType,
                planData.enforceSeatLimit,
                planData.enforceUsageLimit,
                planData.allowOverage
            );

            expect(result).toEqual(mockPlan);
            expect(planEnforcementRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                orgId: mockOrgId,
                planType: 'free',
                limits: expect.objectContaining({
                    seats: 1,
                    features: ['basic_optimization', 'pdf_export']
                })
            }));
        });

        it('should create plan enforcement for enterprise tier', async () => {
            const planData = {
                orgId: mockOrgId,
                planType: 'enterprise' as const,
                enforceSeatLimit: true,
                enforceUsageLimit: true,
                allowOverage: true,
            };

            const mockPlan = { id: 'plan-id', ...planData };
            planEnforcementRepo.create.mockReturnValue(mockPlan);
            planEnforcementRepo.save.mockResolvedValue(mockPlan);

            const result = await service.createPlanEnforcement(
                planData.orgId,
                planData.planType,
                planData.enforceSeatLimit,
                planData.enforceUsageLimit,
                planData.allowOverage
            );

            expect(result).toEqual(mockPlan);
            expect(planEnforcementRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                orgId: mockOrgId,
                planType: 'enterprise',
                limits: expect.objectContaining({
                    seats: 1000,
                    features: expect.arrayContaining(['sso', 'scim', 'audit_logs', 'api_access'])
                })
            }));
        });
    });

    describe('Seat Limit Enforcement', () => {
        it('should allow operation when under seat limit', async () => {
            const mockPlan = {
                id: 'plan-id',
                orgId: mockOrgId,
                planType: 'starter',
                limits: { seats: 5 },
                enforceSeatLimit: true,
                allowOverage: false,
            };

            planEnforcementRepo.findOne.mockResolvedValue(mockPlan);
            (userService.getActiveUserCount as jest.Mock).mockResolvedValue(3);

            const result = await service.checkSeatLimit(mockOrgId);

            expect(result.allowed).toBe(true);
            expect(result.currentUsage.seats).toBe(3);
            expect(result.limits.seats).toBe(5);
        });

        it('should block operation when over seat limit', async () => {
            const mockPlan = {
                id: 'plan-id',
                orgId: mockOrgId,
                planType: 'starter',
                limits: { seats: 5 },
                enforceSeatLimit: true,
                allowOverage: false,
            };

            planEnforcementRepo.findOne.mockResolvedValue(mockPlan);
            (userService.getActiveUserCount as jest.Mock).mockResolvedValue(6);

            const result = await service.checkSeatLimit(mockOrgId);

            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Seat limit exceeded');
            expect(result.currentUsage.seats).toBe(6);
            expect(result.limits.seats).toBe(5);
        });

        it('should allow overage when configured', async () => {
            const mockPlan = {
                id: 'plan-id',
                orgId: mockOrgId,
                planType: 'professional',
                limits: { seats: 25 },
                enforceSeatLimit: true,
                allowOverage: true,
                overageRates: { seats: 6.00 },
            };

            planEnforcementRepo.findOne.mockResolvedValue(mockPlan);
            (userService.getActiveUserCount as jest.Mock).mockResolvedValue(30);

            const result = await service.checkSeatLimit(mockOrgId);

            expect(result.allowed).toBe(true);
            expect(result.overageAmount).toBe(5);
            expect(result.overageCost).toBe(30.00);
        });
    });

    describe('Usage Limit Enforcement', () => {
        it('should allow operation when under usage limit', async () => {
            const mockPlan = {
                id: 'plan-id',
                orgId: mockOrgId,
                planType: 'starter',
                limits: {
                    exports: { daily: 20, monthly: 200, yearly: 2000 },
                    optimizations: { daily: 50, monthly: 500, yearly: 5000 },
                    cover_letters: { daily: 10, monthly: 100, yearly: 1000 },
                    api_calls: { daily: 500, monthly: 5000, yearly: 50000 },
                    storage_gb: 10,
                    features: [],
                },
                enforceUsageLimit: true,
                allowOverage: false,
            };

            planEnforcementRepo.findOne.mockResolvedValue(mockPlan);
            (userService.getActiveUserCount as jest.Mock).mockResolvedValue(3);
            (billingService.getUsageStats as jest.Mock).mockResolvedValue({
                exports: 150,
                optimizations: 400,
                cover_letters: 80,
                api_calls: 4000,
                storage_gb: 8,
            });

            const result = await service.checkUsageLimit(mockOrgId, 'export', 1);

            expect(result.allowed).toBe(true);
            expect(result.currentUsage.exports).toBe(150);
            expect(result.limits.exports).toBe(200);
        });

        it('should block operation when over usage limit', async () => {
            const mockPlan = {
                id: 'plan-id',
                orgId: mockOrgId,
                planType: 'starter',
                limits: {
                    exports: { daily: 20, monthly: 200, yearly: 2000 },
                    optimizations: { daily: 50, monthly: 500, yearly: 5000 },
                    cover_letters: { daily: 10, monthly: 100, yearly: 1000 },
                    api_calls: { daily: 500, monthly: 5000, yearly: 50000 },
                    storage_gb: 10,
                    features: [],
                },
                enforceUsageLimit: true,
                allowOverage: false,
            };

            planEnforcementRepo.findOne.mockResolvedValue(mockPlan);
            (userService.getActiveUserCount as jest.Mock).mockResolvedValue(3);
            (billingService.getUsageStats as jest.Mock).mockResolvedValue({
                exports: 200,
                optimizations: 400,
                cover_letters: 80,
                api_calls: 4000,
                storage_gb: 8,
            });

            const result = await service.checkUsageLimit(mockOrgId, 'export', 1);

            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('export limit exceeded');
            expect(result.currentUsage.exports).toBe(200);
            expect(result.limits.exports).toBe(200);
        });

        it('should allow overage when configured', async () => {
            const mockPlan = {
                id: 'plan-id',
                orgId: mockOrgId,
                planType: 'professional',
                limits: {
                    exports: { daily: 100, monthly: 1000, yearly: 10000 },
                    optimizations: { daily: 250, monthly: 2500, yearly: 25000 },
                    cover_letters: { daily: 50, monthly: 500, yearly: 5000 },
                    api_calls: { daily: 2500, monthly: 25000, yearly: 250000 },
                    storage_gb: 100,
                    features: [],
                },
                enforceUsageLimit: true,
                allowOverage: true,
                overageRates: { exports: 0.06 },
            };

            planEnforcementRepo.findOne.mockResolvedValue(mockPlan);
            (userService.getActiveUserCount as jest.Mock).mockResolvedValue(20);
            (billingService.getUsageStats as jest.Mock).mockResolvedValue({
                exports: 1000,
                optimizations: 2000,
                cover_letters: 400,
                api_calls: 20000,
                storage_gb: 80,
            });

            const result = await service.checkUsageLimit(mockOrgId, 'export', 50);

            expect(result.allowed).toBe(true);
            expect(result.overageAmount).toBe(50);
            expect(result.overageCost).toBe(3.00);
        });
    });

    describe('Feature Access Control', () => {
        it('should return true for enabled features', async () => {
            const mockPlan = {
                id: 'plan-id',
                orgId: mockOrgId,
                planType: 'professional',
                limits: {
                    features: ['basic_optimization', 'advanced_optimization', 'collaboration', 'versioning'],
                },
            };

            planEnforcementRepo.findOne.mockResolvedValue(mockPlan);

            const result = await service.isFeatureEnabled(mockOrgId, 'collaboration');
            expect(result).toBe(true);
        });

        it('should return false for disabled features', async () => {
            const mockPlan = {
                id: 'plan-id',
                orgId: mockOrgId,
                planType: 'starter',
                limits: {
                    features: ['basic_optimization', 'pdf_export'],
                },
            };

            planEnforcementRepo.findOne.mockResolvedValue(mockPlan);

            const result = await service.isFeatureEnabled(mockOrgId, 'collaboration');
            expect(result).toBe(false);
        });
    });

    describe('Plan Enforcement Integration', () => {
        it('should enforce both seat and usage limits', async () => {
            const mockPlan = {
                id: 'plan-id',
                orgId: mockOrgId,
                planType: 'starter',
                limits: {
                    seats: 5,
                    exports: { daily: 20, monthly: 200, yearly: 2000 },
                    optimizations: { daily: 50, monthly: 500, yearly: 5000 },
                    cover_letters: { daily: 10, monthly: 100, yearly: 1000 },
                    api_calls: { daily: 500, monthly: 5000, yearly: 50000 },
                    storage_gb: 10,
                    features: [],
                },
                enforceSeatLimit: true,
                enforceUsageLimit: true,
                allowOverage: false,
            };

            planEnforcementRepo.findOne.mockResolvedValue(mockPlan);
            (userService.getActiveUserCount as jest.Mock).mockResolvedValue(3);
            (billingService.getUsageStats as jest.Mock).mockResolvedValue({
                exports: 150,
                optimizations: 400,
                cover_letters: 80,
                api_calls: 4000,
                storage_gb: 8,
            });

            // Should not throw when under limits
            await expect(service.enforcePlanLimits(mockOrgId, 'export', 1)).resolves.not.toThrow();
        });

        it('should throw ForbiddenException when limits exceeded', async () => {
            const mockPlan = {
                id: 'plan-id',
                orgId: mockOrgId,
                planType: 'starter',
                limits: {
                    seats: 5,
                    exports: { daily: 20, monthly: 200, yearly: 2000 },
                    optimizations: { daily: 50, monthly: 500, yearly: 5000 },
                    cover_letters: { daily: 10, monthly: 100, yearly: 1000 },
                    api_calls: { daily: 500, monthly: 5000, yearly: 50000 },
                    storage_gb: 10,
                    features: [],
                },
                enforceSeatLimit: true,
                enforceUsageLimit: true,
                allowOverage: false,
            };

            planEnforcementRepo.findOne.mockResolvedValue(mockPlan);
            (userService.getActiveUserCount as jest.Mock).mockResolvedValue(6);
            (billingService.getUsageStats as jest.Mock).mockResolvedValue({
                exports: 150,
                optimizations: 400,
                cover_letters: 80,
                api_calls: 4000,
                storage_gb: 8,
            });

            // Should throw when seat limit exceeded
            await expect(service.enforcePlanLimits(mockOrgId, 'export', 1)).rejects.toThrow('Seat limit exceeded');
        });
    });
});
