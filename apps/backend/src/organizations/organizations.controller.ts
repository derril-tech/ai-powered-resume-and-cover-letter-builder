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
import { OrganizationsService, CreateOrganizationDto, UpdateOrganizationDto } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReadOrganizations, WriteOrganizations, DeleteOrganizations } from '../rbac/decorators/rbac.decorator';

class InviteUserDto {
    email: string;
    role: 'owner' | 'admin' | 'editor' | 'viewer';
}

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class OrganizationsController {
    constructor(private readonly organizationsService: OrganizationsService) { }

    @Post()
    @WriteOrganizations()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new organization' })
    @ApiResponse({ status: 201, description: 'Organization created successfully' })
    @ApiResponse({ status: 409, description: 'Organization slug already exists' })
    async create(
        @Body() createOrganizationDto: CreateOrganizationDto,
        @Request() req: any,
    ) {
        return this.organizationsService.create(createOrganizationDto, req.user.id);
    }

    @Get()
    @ReadOrganizations()
    @ApiOperation({ summary: 'Get user\'s organizations' })
    @ApiResponse({ status: 200, description: 'List of user organizations' })
    async findUserOrganizations(@Request() req: any) {
        return this.organizationsService.findByUserId(req.user.id);
    }

    @Get(':id')
    @ReadOrganizations()
    @ApiOperation({ summary: 'Get organization by ID' })
    @ApiResponse({ status: 200, description: 'Organization details' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    async findOne(@Param('id') id: string) {
        return this.organizationsService.findOne(id);
    }

    @Get('slug/:slug')
    @ReadOrganizations()
    @ApiOperation({ summary: 'Get organization by slug' })
    @ApiResponse({ status: 200, description: 'Organization details' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    async findBySlug(@Param('slug') slug: string) {
        return this.organizationsService.findBySlug(slug);
    }

    @Put(':id')
    @WriteOrganizations()
    @ApiOperation({ summary: 'Update organization' })
    @ApiResponse({ status: 200, description: 'Organization updated successfully' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    async update(
        @Param('id') id: string,
        @Body() updateOrganizationDto: UpdateOrganizationDto,
        @Request() req: any,
    ) {
        return this.organizationsService.update(id, updateOrganizationDto, req.user.id);
    }

    @Delete(':id')
    @DeleteOrganizations()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete organization' })
    @ApiResponse({ status: 204, description: 'Organization deleted successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    async remove(@Param('id') id: string, @Request() req: any) {
        await this.organizationsService.remove(id, req.user.id);
    }

    @Get(':id/members')
    @ReadOrganizations()
    @ApiOperation({ summary: 'Get organization members' })
    @ApiResponse({ status: 200, description: 'List of organization members' })
    async getMembers(@Param('id') id: string) {
        return this.organizationsService.getMembers(id);
    }

    @Post(':id/invite')
    @WriteOrganizations()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Invite user to organization' })
    @ApiResponse({ status: 200, description: 'User invited successfully' })
    @ApiResponse({ status: 409, description: 'User already a member' })
    async inviteUser(
        @Param('id') id: string,
        @Body() inviteUserDto: InviteUserDto,
        @Request() req: any,
    ) {
        return this.organizationsService.inviteUser(
            id,
            inviteUserDto.email,
            inviteUserDto.role,
            req.user.id,
        );
    }

    @Delete(':id/members/:userId')
    @WriteOrganizations()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Remove user from organization' })
    @ApiResponse({ status: 204, description: 'User removed successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    async removeMember(
        @Param('id') id: string,
        @Param('userId') userId: string,
        @Request() req: any,
    ) {
        await this.organizationsService.removeMember(id, userId, req.user.id);
    }

    @Post(':id/transfer-ownership')
    @DeleteOrganizations()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Transfer organization ownership' })
    @ApiResponse({ status: 200, description: 'Ownership transferred successfully' })
    @ApiResponse({ status: 403, description: 'Only owner can transfer ownership' })
    async transferOwnership(
        @Param('id') id: string,
        @Body() transferDto: { newOwnerId: string },
        @Request() req: any,
    ) {
        await this.organizationsService.transferOwnership(
            id,
            transferDto.newOwnerId,
            req.user.id,
        );
        return { message: 'Ownership transferred successfully' };
    }
}
