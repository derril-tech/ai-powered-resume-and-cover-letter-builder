import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Strategies
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { SamlStrategy } from './strategies/saml.strategy';
import { OidcStrategy } from './strategies/oidc.strategy';

// Services
import { AuthService } from './services/auth.service';
import { ScimService } from './services/scim.service';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

// Controllers
import { AuthController } from './auth.controller';
import { ScimController } from './scim.controller';

// Entities
import { Users } from '../entities/users.entity';
import { Organizations } from '../entities/organizations.entity';
import { Memberships } from '../entities/memberships.entity';

// Shared services
import { RedisService } from '../../../shared/src/redis-client';
import { RoleService } from '../rbac/role.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Users, Organizations, Memberships]),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET') || 'fallback-secret',
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '15m',
                },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [AuthController, ScimController],
    providers: [
        AuthService,
        ScimService,
        RoleService,
        JwtStrategy,
        JwtRefreshStrategy,
        LocalStrategy,
        GoogleStrategy,
        GithubStrategy,
        SamlStrategy,
        OidcStrategy,
        JwtAuthGuard,
        LocalAuthGuard,
        RedisService,
    ],
    exports: [
        AuthService,
        ScimService,
        JwtAuthGuard,
        LocalAuthGuard,
        PassportModule,
    ],
})
export class AuthModule { }
