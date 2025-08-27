import {
    Controller,
    Post,
    Body,
    Get,
    UseGuards,
    Request,
    Res,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { Public } from './decorators/public.decorator';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService, LoginResponse } from './services/auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

class LoginDto {
    email: string;
    password: string;
}

class RegisterDto {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
}

class RefreshTokenDto {
    refreshToken: string;
}

class ChangePasswordDto {
    oldPassword: string;
    newPassword: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @Public()
    @UseGuards(LocalAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'User login' })
    @ApiResponse({
        status: 200,
        description: 'Login successful',
        type: LoginResponse,
    })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Request() req: any, @Body() loginDto: LoginDto): Promise<LoginResponse> {
        return this.authService.generateTokens(req.user);
    }

    @Post('register')
    @Public()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'User registration' })
    @ApiResponse({ status: 201, description: 'Registration successful' })
    @ApiResponse({ status: 409, description: 'User already exists' })
    async register(@Body() registerDto: RegisterDto): Promise<{ message: string }> {
        const user = await this.authService.register(
            registerDto.email,
            registerDto.password,
            registerDto.firstName,
            registerDto.lastName,
        );

        return {
            message: 'Registration successful. Please check your email to verify your account.',
        };
    }

    @Post('refresh')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiResponse({ status: 200, description: 'Token refreshed' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async refresh(@Body() refreshDto: RefreshTokenDto): Promise<LoginResponse> {
        return this.authService.refreshAccessToken(refreshDto.refreshToken);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'User logout' })
    @ApiResponse({ status: 200, description: 'Logout successful' })
    @ApiBearerAuth('JWT-auth')
    async logout(@Request() req: any): Promise<{ message: string }> {
        // In a real implementation, you'd get the token ID from the request
        // and revoke the refresh token
        return { message: 'Logout successful' };
    }

    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Change user password' })
    @ApiResponse({ status: 200, description: 'Password changed successfully' })
    @ApiBearerAuth('JWT-auth')
    async changePassword(
        @Request() req: any,
        @Body() changePasswordDto: ChangePasswordDto,
    ): Promise<{ message: string }> {
        await this.authService.changePassword(
            req.user.id,
            changePasswordDto.oldPassword,
            changePasswordDto.newPassword,
        );

        return { message: 'Password changed successfully' };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'User profile' })
    @ApiBearerAuth('JWT-auth')
    async getProfile(@Request() req: any) {
        return req.user;
    }

    // OAuth routes
    @Get('google')
    @Public()
    @ApiOperation({ summary: 'Initiate Google OAuth login' })
    @ApiResponse({ status: 302, description: 'Redirect to Google' })
    googleAuth() {
        // This would redirect to Google OAuth
        return { message: 'Redirect to Google OAuth' };
    }

    @Get('google/callback')
    @Public()
    @ApiOperation({ summary: 'Google OAuth callback' })
    @ApiResponse({ status: 200, description: 'OAuth successful' })
    googleAuthCallback(@Request() req: any, @Res() res: Response) {
        // Handle Google OAuth callback
        return res.json({ message: 'Google OAuth callback' });
    }

    @Get('github')
    @Public()
    @ApiOperation({ summary: 'Initiate GitHub OAuth login' })
    @ApiResponse({ status: 302, description: 'Redirect to GitHub' })
    githubAuth() {
        // This would redirect to GitHub OAuth
        return { message: 'Redirect to GitHub OAuth' };
    }

    @Get('github/callback')
    @Public()
    @ApiOperation({ summary: 'GitHub OAuth callback' })
    @ApiResponse({ status: 200, description: 'OAuth successful' })
    githubAuthCallback(@Request() req: any, @Res() res: Response) {
        // Handle GitHub OAuth callback
        return res.json({ message: 'GitHub OAuth callback' });
    }

    // SAML routes
    @Get('saml')
    @Public()
    @ApiOperation({ summary: 'Initiate SAML login' })
    @ApiResponse({ status: 302, description: 'Redirect to SAML IdP' })
    samlAuth() {
        // This would redirect to SAML Identity Provider
        return { message: 'Redirect to SAML Identity Provider' };
    }

    @Post('saml/callback')
    @Public()
    @ApiOperation({ summary: 'SAML callback' })
    @ApiResponse({ status: 200, description: 'SAML authentication successful' })
    samlAuthCallback(@Request() req: any, @Res() res: Response) {
        // Handle SAML callback
        return res.json({ message: 'SAML authentication successful' });
    }

    // OIDC routes
    @Get('oidc')
    @Public()
    @ApiOperation({ summary: 'Initiate OIDC login' })
    @ApiResponse({ status: 302, description: 'Redirect to OIDC Provider' })
    oidcAuth() {
        // This would redirect to OIDC Provider
        return { message: 'Redirect to OIDC Provider' };
    }

    @Get('oidc/callback')
    @Public()
    @ApiOperation({ summary: 'OIDC callback' })
    @ApiResponse({ status: 200, description: 'OIDC authentication successful' })
    oidcAuthCallback(@Request() req: any, @Res() res: Response) {
        // Handle OIDC callback
        return res.json({ message: 'OIDC authentication successful' });
    }
}
