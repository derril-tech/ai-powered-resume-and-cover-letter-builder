import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipsService } from './memberships.service';
import { MembershipsController } from './memberships.controller';
import { Memberships } from '../entities/memberships.entity';
import { Users } from '../entities/users.entity';
import { Organizations } from '../entities/organizations.entity';
import { RoleService } from '../rbac/role.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Memberships, Users, Organizations]),
    ],
    controllers: [MembershipsController],
    providers: [MembershipsService, RoleService],
    exports: [MembershipsService],
})
export class MembershipsModule { }
