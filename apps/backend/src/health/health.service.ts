import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
    private readonly logger = new Logger(HealthService.name);

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }

    async check(): Promise<any> {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
        };
    }

    async detailedCheck(): Promise<any> {
        const checks = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            services: {
                database: await this.checkDatabase(),
            },
        };

        // Check if any service is down
        const hasIssues = Object.values(checks.services).some(
            (service: any) => service.status !== 'up',
        );

        if (hasIssues) {
            checks.status = 'degraded';
        }

        return checks;
    }

    private async checkDatabase(): Promise<any> {
        try {
            await this.dataSource.query('SELECT 1');
            return {
                status: 'up',
                message: 'Database connection successful',
            };
        } catch (error) {
            this.logger.error('Database health check failed:', error);
            return {
                status: 'down',
                message: 'Database connection failed',
                error: error.message,
            };
        }
    }
}
