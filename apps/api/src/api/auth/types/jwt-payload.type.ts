export type JwtPayloadType = {
  id: string;
  sessionId: string;
  hash?: string;
  impersonatedBy?: string;
  impersonationExpiresAt?: Date;
  iat: number;
  exp: number;
};
