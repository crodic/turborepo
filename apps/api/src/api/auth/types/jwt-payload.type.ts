export type JwtPayloadType = {
  id: string;
  sessionId: string;
  hash?: string;
  impersonatedBy?: string;
  impersonationHistoryId?: string;
  impersonationExpiresAt?: Date;
  iat: number;
  exp: number;
};
