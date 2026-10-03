import { AutoIncrementID } from '@/common/types/common.type';

export enum WsUserType {
  ADMIN = 'admin',
  USER = 'user',
}

export type WsPrincipal = {
  id: AutoIncrementID;
  type: WsUserType;
  sessionId?: AutoIncrementID | string;
  tokenHash?: string;
  email: string;
  fullName?: string;
  avatar?: string;
};
