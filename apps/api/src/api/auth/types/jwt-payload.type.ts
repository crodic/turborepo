export type JwtPayloadType = {
  id: string;
  sessionId: string;
  hash?: string;
  impersonatedBy?: string;
  iat: number;
  exp: number;
};
