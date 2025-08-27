import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import { MembershipsService, UpdateMembershipDto } from './memberships.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReadMemberships, WriteMemberships, DeleteMemberships } from '../rbac/decorators/rbac.decorator';

@ApiTags('memberships')
@Controller('memberships')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MembershipsController {
    constructor(private readonly membershipsService: MembershipsService) { }

    @Get('pending')
    @ApiOperation({ summary: 'Get pending membership invitations' })
    @ApiResponse({ status: 200, description: 'List of pending invitations' })
    async getPendingInvitations(@Request() req: any) {
        return this.membershipsService.getPendingInvitations(req.user.id);
    }

    @Get('organizations/:organizationId')
    @ReadMemberships()
    @ApiOperation({ summary: 'Get organization memberships' })
    @ApiResponse({ status: 200, description: 'List of organization memberships' })
    async findByOrganization(@Param('organizationId') organizationId: string) {
        return this.membershipsService.findByOrganization(organizationId);
    }

    @Get('users/:userId')
    @ReadMemberships()
    @ApiOperation({ summary: 'Get user memberships' })
    @ApiResponse({ status: 200, description: 'List of user memberships' })
    async findByUser(@Param('userId') userId: string) {
        return this.membershipsService.findByUser(userId);
    }

    @Get(':id')
    @ReadMemberships()
    @ApiOperation({ summary: 'Get membership by ID' })
    @ApiResponse({ status: 200, description: 'Membership details' })
    @ApiResponse({ status: 404, description: 'Membership not found' })
    async findOne(@Param('id') id: string) {
        return this.membershipsService.findOne(id);
    }

    @Post('accept/:id')
    @WriteMemberships()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Accept membership invitation' })
    @ApiResponse({ status: 200, description: 'Invitation accepted successfully' })
    @ApiResponse({ status: 409, description: 'Invitation already accepted' })
    async acceptInvitation(
        @Param('id') id: string,
        @Request() req: any,
    ) {
        return this.membershipsService.acceptInvitation(id, req.user.id);
    }

    @Put(':id/role')
    @WriteMemberships()
    @ApiOperation({ summary: 'Update membership role' })
    @ApiResponse({ status: 200, description: 'Role updated successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    async updateRole(
        @Param('id') id: string,
        @Body() updateMembershipDto: UpdateMembershipDto,
        @Request() req: any,
    ) {
        return this.membershipsService.updateRole(id, updateMembershipDto, req.user.id);
    }

    @Delete(':id')
    @DeleteMemberships()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Remove membership' })
    @ApiResponse({ status: 204, description: 'Membership removed successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    async remove(@Param('id') id: string, @Request() req: any) {
        await this.membershipsService.remove(id, req.user.id);
    }

    @Get('organizations/:organizationId/stats')
    @ReadMemberships()
    @ApiOperation({ summary: 'Get organization membership statistics' })
    @ApiResponse({ status: 200, description: 'Organization membership stats' })
    async getOrganizationStats(@Param('organizationId') organizationId: string) {
        return this.membershipsService.getOrganizationStats(organizationId);
    }
}
