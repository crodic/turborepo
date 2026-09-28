import { AutoIncrementID } from '@/common/types/common.type';

export enum WsUserType {
  ADMIN = 'admin',
  USER = 'user',
}

export const PresenceUserType = WsUserType;
export type PresenceUserType = WsUserType;

export type WsPrincipal = {
  id: AutoIncrementID;
  type: WsUserType;
  sessionId?: AutoIncrementID | string;
  tokenHash?: string;
  email: string;
  fullName?: string;
  avatar?: string;
};

export type PresencePrincipal = WsPrincipal;

export type OnlinePresence = Omit<WsPrincipal, 'tokenHash'> & {
  socketCount: number;
  connectedAt: Date;
  lastSeenAt: Date;
};

export type PresenceSnapshot = {
  admins: OnlinePresence[];
  users: OnlinePresence[];
  counts: {
    admins: number;
    users: number;
    total: number;
  };
};
