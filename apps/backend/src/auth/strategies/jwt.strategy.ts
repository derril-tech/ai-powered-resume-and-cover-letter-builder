import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Users } from '../../entities/users.entity';

export interface JwtPayload {
    sub: string; // user id
    email: string;
    iat?: number;
    exp?: number;
    organizationId?: string; // optional organization context
}

export interface AuthenticatedUser extends Users {
    organizationId?: string; // current organization context
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-secret',
        });
    }

    async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
        if (!payload.sub || !payload.email) {
            throw new UnauthorizedException('Invalid token payload');
        }

        // In a real implementation, you would fetch the user from the database
        // For now, we'll return a minimal user object
        const user: AuthenticatedUser = {
            id: payload.sub,
            email: payload.email,
            organizationId: payload.organizationId,
        } as AuthenticatedUser;

        return user;
    }
}
