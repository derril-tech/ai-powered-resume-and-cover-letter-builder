# Created automatically by Cursor AI(2024 - 12 - 19)

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanEnforcementEntity } from '../entities/plan_enforcement.entity';
import { PlanEnforcementService } from './plan-enforcement.service';
import { BillingModule } from '../billing/billing.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([PlanEnforcementEntity]),
        BillingModule,
        OrganizationsModule,
        UsersModule
    ],
    providers: [PlanEnforcementService],
    exports: [PlanEnforcementService]
})
export class PlanEnforcementModule { }
