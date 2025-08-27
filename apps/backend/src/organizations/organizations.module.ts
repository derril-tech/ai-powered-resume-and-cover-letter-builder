import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { Organizations } from '../entities/organizations.entity';
import { Users } from '../entities/users.entity';
import { Memberships } from '../entities/memberships.entity';
import { RoleService } from '../rbac/role.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Organizations, Users, Memberships]),
    ],
    controllers: [OrganizationsController],
    providers: [OrganizationsService, RoleService],
    exports: [OrganizationsService],
})
export class OrganizationsModule { }
