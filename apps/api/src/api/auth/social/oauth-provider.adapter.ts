import { OAuthProviderProfile } from './oauth-provider-profile.type';

export interface OAuthProviderAdapter<RawProfile = unknown> {
  normalize(profile: RawProfile): OAuthProviderProfile;
}
