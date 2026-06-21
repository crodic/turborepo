export type JwtPayloadType = {
  id: string;
  sessionId: string;
  hash?: string;
  iat: number;
  exp: number;
};
