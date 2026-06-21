import { AutoIncrementID } from '@/common/types/common.type';

export type JwtRefreshPayloadType = {
  sessionId: AutoIncrementID;
  hash: string;
  iat: number;
  exp: number;
};
