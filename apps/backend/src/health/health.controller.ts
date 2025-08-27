import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
    constructor(private readonly healthService: HealthService) { }

    @Get()
    @ApiOperation({ summary: 'Health check endpoint' })
    @ApiResponse({
        status: 200,
        description: 'Service is healthy',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'ok' },
                timestamp: { type: 'string', example: '2023-01-01T00:00:00.000Z' },
                version: { type: 'string', example: '1.0.0' },
            },
        },
    })
    async check(): Promise<any> {
        return this.healthService.check();
    }

    @Get('detailed')
    @ApiOperation({ summary: 'Detailed health check with dependencies' })
    @ApiResponse({
        status: 200,
        description: 'Detailed health status',
    })
    async detailedCheck(): Promise<any> {
        return this.healthService.detailedCheck();
    }
}
