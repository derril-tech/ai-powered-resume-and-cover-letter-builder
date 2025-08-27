import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Projects } from '../entities/projects.entity';
import { Organizations } from '../entities/organizations.entity';
import { Jobs } from '../entities/jobs.entity';
import { Users } from '../entities/users.entity';
import { Memberships } from '../entities/memberships.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Projects, Organizations, Jobs, Users, Memberships]),
    ],
    controllers: [ProjectsController],
    providers: [ProjectsService],
    exports: [ProjectsService],
})
export class ProjectsModule { }
