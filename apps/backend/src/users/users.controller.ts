import {
    Controller,
    Get,
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
import { UsersService, UpdateUserDto } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReadUsers, WriteUsers, DeleteUsers } from '../rbac/decorators/rbac.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('profile')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'User profile' })
    async getProfile(@Request() req: any) {
        return this.usersService.getProfile(req.user.id);
    }

    @Put('profile')
    @WriteUsers()
    @ApiOperation({ summary: 'Update user profile' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    async updateProfile(
        @Body() updateUserDto: UpdateUserDto,
        @Request() req: any,
    ) {
        return this.usersService.updateProfile(req.user.id, updateUserDto);
    }

    @Get('organizations')
    @ApiOperation({ summary: 'Get user\'s organizations' })
    @ApiResponse({ status: 200, description: 'List of user organizations' })
    async getUserOrganizations(@Request() req: any) {
        return this.usersService.getUserOrganizations(req.user.id);
    }

    @Get('memberships')
    @ApiOperation({ summary: 'Get user\'s memberships' })
    @ApiResponse({ status: 200, description: 'List of user memberships' })
    async getUserMemberships(@Request() req: any) {
        return this.usersService.getUserMemberships(req.user.id);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get user statistics' })
    @ApiResponse({ status: 200, description: 'User statistics' })
    async getUserStats(@Request() req: any) {
        return this.usersService.getUserStats(req.user.id);
    }

    @Get('search')
    @ReadUsers()
    @ApiOperation({ summary: 'Search users' })
    @ApiResponse({ status: 200, description: 'Search results' })
    @ApiQuery({ name: 'q', description: 'Search query' })
    @ApiQuery({ name: 'orgId', required: false, description: 'Organization ID to search within' })
    async searchUsers(
        @Query('q') query: string,
        @Query('orgId') organizationId?: string,
    ) {
        return this.usersService.searchUsers(query, organizationId);
    }

    @Get('email-available')
    @ApiOperation({ summary: 'Check if email is available' })
    @ApiResponse({ status: 200, description: 'Email availability status' })
    @ApiQuery({ name: 'email', description: 'Email to check' })
    async checkEmailAvailability(
        @Query('email') email: string,
        @Query('excludeUserId') excludeUserId?: string,
    ) {
        const available = await this.usersService.isEmailAvailable(email, excludeUserId);
        return { email, available };
    }

    @Get(':id')
    @ReadUsers()
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiResponse({ status: 200, description: 'User details' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async findOne(@Param('id') id: string) {
        return this.usersService.getProfile(id);
    }

    @Delete('account')
    @DeleteUsers()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete user account' })
    @ApiResponse({ status: 204, description: 'Account deleted successfully' })
    @ApiResponse({ status: 409, description: 'Cannot delete account with active organizations' })
    async deleteAccount(@Request() req: any) {
        await this.usersService.deleteAccount(req.user.id);
    }
}
