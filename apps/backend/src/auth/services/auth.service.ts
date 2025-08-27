import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Users } from '../../entities/users.entity';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../shared/src/redis-client';

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: Partial<Users>;
    expiresIn: number;
}

export interface RefreshTokenData {
    userId: string;
    tokenId: string;
    expiresAt: number;
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectRepository(Users)
        private readonly usersRepository: Repository<Users>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
    ) { }

    /**
     * Validate user credentials
     */
    async validateUser(email: string, password: string): Promise<Users | null> {
        try {
            const user = await this.usersRepository.findOne({ where: { email } });
            if (!user) {
                return null;
            }

            const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
            if (!isPasswordValid) {
                return null;
            }

            return user;
        } catch (error) {
            this.logger.error('Error validating user:', error);
            return null;
        }
    }

    /**
     * Validate OAuth user and create/update local user
     */
    async validateOAuthUser(
        provider: string,
        providerId: string,
        email: string,
        profile: any,
    ): Promise<Users> {
        try {
            // Try to find existing user by email or provider
            let user = await this.usersRepository.findOne({
                where: [
                    { email },
                    // Note: In a real implementation, you'd have provider fields
                ],
            });

            if (user) {
                // Update user with OAuth information
                // In a real implementation, you'd store provider-specific data
                return user;
            }

            // Create new user from OAuth profile
            const newUser = this.usersRepository.create({
                email,
                firstName: profile.name?.givenName || profile.displayName?.split(' ')[0],
                lastName: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' '),
                avatarUrl: profile.photos?.[0]?.value,
                emailVerified: true, // OAuth emails are typically verified
            });

            return await this.usersRepository.save(newUser);
        } catch (error) {
            this.logger.error('Error validating OAuth user:', error);
            throw new UnauthorizedException('Failed to authenticate with OAuth provider');
        }
    }

    /**
     * Generate access and refresh tokens
     */
    async generateTokens(user: Users, organizationId?: string): Promise<LoginResponse> {
        const payload = {
            sub: user.id,
            email: user.email,
            organizationId,
        };

        const accessTokenExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
        const refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

        // Generate access token
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: accessTokenExpiresIn,
        });

        // Generate refresh token with unique ID
        const tokenId = this.generateTokenId();
        const refreshToken = this.jwtService.sign(
            {
                sub: user.id,
                email: user.email,
                tokenId,
            },
            {
                expiresIn: refreshTokenExpiresIn,
                secret: this.configService.get<string>('JWT_REFRESH_SECRET') ||
                    this.configService.get<string>('JWT_SECRET'),
            },
        );

        // Store refresh token in Redis
        await this.storeRefreshToken(user.id, tokenId, refreshToken);

        // Calculate expiration time
        const expiresIn = this.parseExpiresIn(accessTokenExpiresIn);

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatarUrl: user.avatarUrl,
            },
            expiresIn,
        };
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken: string): Promise<LoginResponse> {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET') ||
                    this.configService.get<string>('JWT_SECRET'),
            });

            // Verify refresh token exists and is valid
            const storedToken = await this.redisService.get(`refresh_token:${payload.tokenId}`);
            if (!storedToken || storedToken !== refreshToken) {
                throw new UnauthorizedException('Invalid refresh token');
            }

            // Get user
            const user = await this.usersRepository.findOne({
                where: { id: payload.sub },
            });

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            // Generate new tokens
            return await this.generateTokens(user);
        } catch (error) {
            this.logger.error('Error refreshing token:', error);
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    /**
     * Revoke refresh token (logout)
     */
    async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
        await this.redisService.del(`refresh_token:${tokenId}`);
        await this.redisService.del(`user_refresh_tokens:${userId}`);
    }

    /**
     * Revoke all refresh tokens for a user
     */
    async revokeAllRefreshTokens(userId: string): Promise<void> {
        const userTokensKey = `user_refresh_tokens:${userId}`;
        const tokenIds = await this.redisService.get(userTokensKey);

        if (tokenIds) {
            const tokenIdList = JSON.parse(tokenIds);
            for (const tokenId of tokenIdList) {
                await this.redisService.del(`refresh_token:${tokenId}`);
            }
        }

        await this.redisService.del(userTokensKey);
    }

    /**
     * Hash password
     */
    async hashPassword(password: string): Promise<string> {
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }

    /**
     * Register new user
     */
    async register(email: string, password: string, firstName?: string, lastName?: string): Promise<Users> {
        // Check if user already exists
        const existingUser = await this.usersRepository.findOne({ where: { email } });
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Hash password
        const hashedPassword = await this.hashPassword(password);

        // Create user
        const user = this.usersRepository.create({
            email,
            passwordHash: hashedPassword,
            firstName,
            lastName,
            emailVerified: false,
        });

        return await this.usersRepository.save(user);
    }

    /**
     * Change user password
     */
    async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
        const user = await this.usersRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Verify old password
        const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isOldPasswordValid) {
            throw new UnauthorizedException('Invalid old password');
        }

        // Hash new password
        const hashedNewPassword = await this.hashPassword(newPassword);

        // Update password
        user.passwordHash = hashedNewPassword;
        await this.usersRepository.save(user);

        // Revoke all refresh tokens for security
        await this.revokeAllRefreshTokens(userId);
    }

    private async storeRefreshToken(userId: string, tokenId: string, refreshToken: string): Promise<void> {
        const ttl = this.parseExpiresIn(
            this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d'
        );

        // Store refresh token
        await this.redisService.set(`refresh_token:${tokenId}`, refreshToken, ttl);

        // Store user's active refresh tokens
        const userTokensKey = `user_refresh_tokens:${userId}`;
        const existingTokens = await this.redisService.get(userTokensKey);
        const tokenList = existingTokens ? JSON.parse(existingTokens) : [];

        if (!tokenList.includes(tokenId)) {
            tokenList.push(tokenId);
        }

        await this.redisService.set(userTokensKey, JSON.stringify(tokenList), ttl);
    }

    private generateTokenId(): string {
        return require('crypto').randomBytes(16).toString('hex');
    }

    private parseExpiresIn(expiresIn: string): number {
        const unit = expiresIn.slice(-1);
        const value = parseInt(expiresIn.slice(0, -1));

        switch (unit) {
            case 's': return value;
            case 'm': return value * 60;
            case 'h': return value * 3600;
            case 'd': return value * 86400;
            default: return 900; // 15 minutes default
        }
    }
}
