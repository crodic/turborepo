export type LoginResponseData = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  tokenExpires: number;
};

export type User = {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
