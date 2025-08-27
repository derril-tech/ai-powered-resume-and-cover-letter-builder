import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ObservabilityService } from './observability.service';

@Controller('observability')
export class ObservabilityController {
    constructor(private readonly observabilityService: ObservabilityService) { }

    @Get('health')
    async getHealth() {
        return this.observabilityService.healthCheck();
    }

    @Get('metrics')
    async getMetrics() {
        // TODO: Implement Prometheus metrics endpoint
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            message: 'Metrics endpoint - implement Prometheus format'
        };
    }

    @Post('log')
    async logMessage(
        @Body() body: {
            level: 'debug' | 'info' | 'warn' | 'error';
            message: string;
            context?: Record<string, any>;
        }
    ) {
        const { level, message, context } = body;
        await this.observabilityService.log(level, message, context);
        return { success: true };
    }

    @Post('exception')
    async captureException(
        @Body() body: {
            error: string;
            stack?: string;
            context?: {
                userId?: string;
                orgId?: string;
                requestId?: string;
                tags?: Record<string, string>;
                extra?: Record<string, any>;
            };
        }
    ) {
        const error = new Error(body.error);
        if (body.stack) {
            error.stack = body.stack;
        }

        await this.observabilityService.captureException(error, body.context);
        return { success: true };
    }

    @Post('metric')
    async recordMetric(
        @Body() body: {
            type: 'counter' | 'gauge' | 'histogram' | 'summary';
            name: string;
            value: number;
            labels?: Record<string, string>;
        }
    ) {
        const { type, name, value, labels } = body;

        switch (type) {
            case 'counter':
                await this.observabilityService.incrementCounter(name, labels, value);
                break;
            case 'gauge':
                await this.observabilityService.setGauge(name, value, labels);
                break;
            case 'histogram':
                await this.observabilityService.recordHistogram(name, value, labels);
                break;
            case 'summary':
                await this.observabilityService.recordSummary(name, value, labels);
                break;
        }

        return { success: true };
    }

    @Get('performance/:operation')
    async startPerformanceMonitoring(
        @Param('operation') operation: string,
        @Query() query: Record<string, string>
    ) {
        const labels = Object.keys(query).length > 0 ? query : undefined;
        return this.observabilityService.startPerformanceMonitoring(operation, labels);
    }
}
