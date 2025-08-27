import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { ComplianceService } from './compliance.service';

class SetComplianceDto {
    enabled!: boolean;
    protectedFields?: string[];
}

class EnforceDto {
    payload!: Record<string, any>;
    approved?: boolean;
}

@Controller('compliance')
export class ComplianceController {
    constructor(private readonly compliance: ComplianceService) { }

    @Patch(':targetType/:targetId')
    async set(
        @Param('targetType') targetType: 'resume' | 'variant',
        @Param('targetId') targetId: string,
        @Body() dto: SetComplianceDto,
    ) {
        return this.compliance.set(targetType, targetId, dto.enabled, dto.protectedFields);
    }

    @Post('enforce/:targetType/:targetId')
    async enforce(
        @Param('targetType') targetType: 'resume' | 'variant',
        @Param('targetId') targetId: string,
        @Body() dto: EnforceDto,
    ) {
        return this.compliance.enforceEdit(targetType, targetId, dto.payload, !!dto.approved);
    }
}


