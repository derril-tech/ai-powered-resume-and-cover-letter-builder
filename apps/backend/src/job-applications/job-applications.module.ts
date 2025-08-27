import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobApplicationEntity } from '../entities/job_application.entity';
import { JobApplicationsController } from './job-applications.controller';
import { JobApplicationsService } from './job-applications.service';

@Module({
    imports: [TypeOrmModule.forFeature([JobApplicationEntity])],
    controllers: [JobApplicationsController],
    providers: [JobApplicationsService],
    exports: [JobApplicationsService],
})
export class JobApplicationsModule { }
