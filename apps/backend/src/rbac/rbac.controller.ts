import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { RbacService } from './rbac.service';
import { RoleService } from './role.service';
import { RbacGuard } from './guards/rbac.guard';
import {
    ReadOrganizations,
    WriteOrganizations,
    ReadUsers,
    WriteUsers,
} from './decorators/rbac.decorator';

class AssignRoleDto {
    userId: string;
    role: 'owner' | 'admin' | 'editor' | 'viewer';
}

@ApiTags('rbac')
@Controller('rbac')
@UseGuards(RbacGuard)
@ApiBearerAuth('JWT-auth')
export class RbacController {
    constructor(
        private readonly rbacService: RbacService,
        private readonly roleService: RoleService,
    ) { }

    @Get('policies')
    @ReadOrganizations()
    @ApiOperation({ summary: 'Get all RBAC policies' })
    @ApiResponse({ status: 200, description: 'List of all policies' })
    async getPolicies() {
        return await this.rbacService.getAllPolicies();
    }

    @Post('roles/assign/:organizationId')
    @WriteOrganizations()
    @ApiOperation({ summary: 'Assign role to user in organization' })
    @ApiResponse({ status: 200, description: 'Role assigned successfully' })
    async assignRole(
        @Param('organizationId') organizationId: string,
        @Body() assignRoleDto: AssignRoleDto,
    ) {
        return await this.roleService.assignRole(
            assignRoleDto.userId,
            organizationId,
            assignRoleDto.role,
        );
    }

    @Post('roles/revoke/:organizationId')
    @WriteOrganizations()
    @ApiOperation({ summary: 'Revoke role from user in organization' })
    @ApiResponse({ status: 200, description: 'Role revoked successfully' })
    async revokeRole(
        @Param('organizationId') organizationId: string,
        @Body() assignRoleDto: AssignRoleDto,
    ) {
        return await this.roleService.revokeRole(
            assignRoleDto.userId,
            organizationId,
            assignRoleDto.role,
        );
    }

    @Get('roles/:organizationId/:userId')
    @ReadOrganizations()
    @ApiOperation({ summary: 'Get user role in organization' })
    @ApiResponse({ status: 200, description: 'User role information' })
    async getUserRole(
        @Param('organizationId') organizationId: string,
        @Param('userId') userId: string,
    ) {
        const role = await this.roleService.getUserRole(userId, organizationId);
        return { userId, organizationId, role };
    }

    @Get('roles/:organizationId')
    @ReadOrganizations()
    @ApiOperation({ summary: 'Get all users with roles in organization' })
    @ApiResponse({ status: 200, description: 'Organization members with roles' })
    async getOrganizationMembers(@Param('organizationId') organizationId: string) {
        return await this.roleService.getOrganizationMembers(organizationId);
    }

    @Post('check/:organizationId')
    @ReadOrganizations()
    @ApiOperation({ summary: 'Check user permission' })
    @ApiResponse({ status: 200, description: 'Permission check result' })
    async checkPermission(
        @Param('organizationId') organizationId: string,
        @Body() checkDto: { resource: string; action: string },
        @Request() req: any,
    ) {
        const hasPermission = await this.rbacService.hasPermission({
            userId: req.user.id,
            resource: checkDto.resource,
            action: checkDto.action,
            organizationId,
        });

        return {
            userId: req.user.id,
            organizationId,
            resource: checkDto.resource,
            action: checkDto.action,
            hasPermission,
        };
    }
}
