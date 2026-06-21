import { AllConfigType } from '@/config/config.type';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { GoogleOAuthAdapter } from '../social/google-oauth.adapter';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService<AllConfigType>,
    private readonly googleOAuthAdapter: GoogleOAuthAdapter,
  ) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'missing-google-client-id',
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET || 'missing-google-client-secret',
      callbackURL: configService.getOrThrow('auth.googleOAuthCallbackUrl', {
        infer: true,
      }),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    return this.googleOAuthAdapter.normalize(profile);
  }
}
