import { EOAuthProvider } from '@/constants/entity.enum';
import { Injectable } from '@nestjs/common';
import { Profile } from 'passport-google-oauth20';
import { OAuthProviderProfile } from './oauth-provider-profile.type';
import { OAuthProviderAdapter } from './oauth-provider.adapter';

@Injectable()
export class GoogleOAuthAdapter implements OAuthProviderAdapter<Profile> {
  normalize(profile: Profile): OAuthProviderProfile {
    const primaryEmail = profile.emails?.[0];
    const photo = profile.photos?.[0];

    return {
      provider: EOAuthProvider.GOOGLE,
      providerAccountId: profile.id,
      email: primaryEmail?.value?.toLowerCase(),
      emailVerified: Boolean(primaryEmail?.verified),
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      displayName: profile.displayName,
      avatarUrl: photo?.value,
    };
  }
}
