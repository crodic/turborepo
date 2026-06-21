import { EOAuthProvider } from '@/constants/entity.enum';

export type OAuthProviderProfile = {
  provider: EOAuthProvider;
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
};
