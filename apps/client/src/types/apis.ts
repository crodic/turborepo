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
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
