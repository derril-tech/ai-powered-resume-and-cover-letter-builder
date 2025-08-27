import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Issuer, Client } from 'openid-client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, 'oidc') {
    private client: Client;

    constructor(private configService: ConfigService) {
        super({
            client: null, // Will be set in constructor
            params: {
                redirect_uri: configService.get<string>('OIDC_CALLBACK_URL') ||
                    'http://localhost:3001/auth/oidc/callback',
                scope: 'openid profile email',
            },
            passReqToCallback: false,
            usePKCE: true,
        });

        this.initializeClient();
    }

    private async initializeClient(): Promise<void> {
        try {
            const issuerUrl = this.configService.get<string>('OIDC_ISSUER_URL');
            const clientId = this.configService.get<string>('OIDC_CLIENT_ID');
            const clientSecret = this.configService.get<string>('OIDC_CLIENT_SECRET');

            if (!issuerUrl || !clientId || !clientSecret) {
                console.warn('OIDC configuration incomplete. OIDC authentication will not be available.');
                return;
            }

            const issuer = await Issuer.discover(issuerUrl);
            this.client = new issuer.Client({
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uris: [this.configService.get<string>('OIDC_CALLBACK_URL') ||
                    'http://localhost:3001/auth/oidc/callback'],
                response_types: ['code'],
            });

            // Update the strategy with the client
            (this as any).client = this.client;
        } catch (error) {
            console.error('Failed to initialize OIDC client:', error);
        }
    }

    async validate(tokenset: any, userinfo: any, done: any): Promise<any> {
        try {
            const user = {
                provider: 'oidc',
                providerId: tokenset.claims.sub,
                email: userinfo.email || tokenset.claims.email,
                name: userinfo.name || tokenset.claims.name,
                firstName: userinfo.given_name || tokenset.claims.given_name,
                lastName: userinfo.family_name || tokenset.claims.family_name,
                emailVerified: userinfo.email_verified || tokenset.claims.email_verified,
                groups: userinfo.groups || tokenset.claims.groups,
                roles: userinfo.roles || tokenset.claims.roles,
                tokenset: {
                    access_token: tokenset.access_token,
                    refresh_token: tokenset.refresh_token,
                    id_token: tokenset.id_token,
                    expires_at: tokenset.expires_at,
                },
            };

            done(null, user);
        } catch (error) {
            done(error, null);
        }
    }
}
