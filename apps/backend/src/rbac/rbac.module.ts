import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RbacService } from './rbac.service';
import { RoleService } from './role.service';
import { RbacGuard } from './guards/rbac.guard';
import { RbacController } from './rbac.controller';
import { Users } from '../entities/users.entity';
import { Organizations } from '../entities/organizations.entity';
import { Memberships } from '../entities/memberships.entity';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([Users, Organizations, Memberships]),
    ],
    controllers: [RbacController],
    providers: [RbacService, RoleService, RbacGuard],
    exports: [RbacService, RoleService, RbacGuard],
})
export class RbacModule { }
