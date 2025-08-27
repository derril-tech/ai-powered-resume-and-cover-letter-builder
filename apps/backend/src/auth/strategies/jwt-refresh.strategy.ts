import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface RefreshTokenPayload {
    sub: string; // user id
    email: string;
    tokenId: string; // unique identifier for this refresh token
    iat?: number;
    exp?: number;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') ||
                configService.get<string>('JWT_SECRET') ||
                'fallback-secret',
            passReqToCallback: true,
        });
    }

    async validate(request: Request, payload: RefreshTokenPayload) {
        if (!payload.sub || !payload.email || !payload.tokenId) {
            throw new UnauthorizedException('Invalid refresh token payload');
        }

        // In a real implementation, you would:
        // 1. Check if the refresh token exists in the database/cache
        // 2. Verify it's not expired or revoked
        // 3. Return the user information

        return {
            id: payload.sub,
            email: payload.email,
            tokenId: payload.tokenId,
        };
    }
}
