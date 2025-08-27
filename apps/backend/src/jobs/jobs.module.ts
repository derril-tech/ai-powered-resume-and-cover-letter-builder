import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { Jobs } from '../entities/jobs.entity';
import { Projects } from '../entities/projects.entity';
import { Organizations } from '../entities/organizations.entity';
import { Users } from '../entities/users.entity';
import { Memberships } from '../entities/memberships.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Jobs, Projects, Organizations, Users, Memberships]),
    ],
    controllers: [JobsController],
    providers: [JobsService],
    exports: [JobsService],
})
export class JobsModule { }
