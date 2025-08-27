import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceSettingEntity } from '../entities/compliance_setting.entity';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';

@Module({
    imports: [TypeOrmModule.forFeature([ComplianceSettingEntity])],
    controllers: [ComplianceController],
    providers: [ComplianceService],
    exports: [ComplianceService],
})
export class ComplianceModule { }


