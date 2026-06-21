export type LoginResponseData = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  tokenExpires: number;
};

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar: string | null;
  hasPassword: boolean;
  isImpersonating?: boolean;
  impersonatedBy?: string;
  impersonationExpiresAt?: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SocialAccount = {
  id: string;
  provider: "google";
  email?: string;
  emailVerified: boolean;
  displayName?: string;
  avatarUrl?: string;
};
