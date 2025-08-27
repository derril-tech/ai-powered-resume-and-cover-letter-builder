import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

// Modules
import { HealthModule } from './health/health.module';
import { RbacModule } from './rbac/rbac.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { MembershipsModule } from './memberships/memberships.module';
import { ProjectsModule } from './projects/projects.module';
import { JobsModule } from './jobs/jobs.module';

// Guards
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

// Configuration
import { getDatabaseConfig } from './config/database.config';
import { getThrottlerConfig } from './config/throttler.config';

@Module({
    imports: [
        // Global configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),

        // Rate limiting
        ThrottlerModule.forRoot(getThrottlerConfig()),

        // Database
        TypeOrmModule.forRoot(getDatabaseConfig()),

        // Scheduler for background tasks
        ScheduleModule.forRoot(),

        // Feature modules
        HealthModule,
        RbacModule,
        AuthModule,
        UsersModule,
        OrganizationsModule,
        MembershipsModule,
        ProjectsModule,
        JobsModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
    ],
})
export class AppModule { }
