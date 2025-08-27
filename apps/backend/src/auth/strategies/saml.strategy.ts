import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-saml';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SamlStrategy extends PassportStrategy(Strategy, 'saml') {
    constructor(private configService: ConfigService) {
        super({
            entryPoint: configService.get<string>('SAML_ENTRY_POINT'),
            issuer: configService.get<string>('SAML_ISSUER') || 'resume-builder-app',
            callbackUrl: configService.get<string>('SAML_CALLBACK_URL') ||
                'http://localhost:3001/auth/saml/callback',
            cert: configService.get<string>('SAML_IDP_CERT'),
            privateCert: configService.get<string>('SAML_SP_PRIVATE_CERT'),
            decryptionPvk: configService.get<string>('SAML_SP_PRIVATE_CERT'),
            signatureAlgorithm: 'sha256',
            digestAlgorithm: 'sha256',
            authnRequestBinding: 'HTTP-POST',
            acceptedClockSkewMs: 5000,
        });
    }

    async validate(
        profile: any,
        done: VerifyCallback,
    ): Promise<any> {
        try {
            // SAML profile contains user information from Identity Provider
            const user = {
                provider: 'saml',
                providerId: profile.nameID,
                email: profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
                name: profile.displayName || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
                firstName: profile.firstName || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'],
                lastName: profile.lastName || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'],
                groups: profile.groups || profile['http://schemas.xmlsoap.org/claims/Group'],
                sessionIndex: profile.sessionIndex,
            };

            done(null, user);
        } catch (error) {
            done(error, null);
        }
    }
}
