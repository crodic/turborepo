import { AutoIncrementID } from '@/common/types/common.type';

export enum PresenceUserType {
  ADMIN = 'admin',
  USER = 'user',
}

export type PresencePrincipal = {
  id: AutoIncrementID;
  type: PresenceUserType;
  sessionId?: AutoIncrementID | string;
  tokenHash?: string;
  email: string;
  fullName?: string;
  avatar?: string;
  impersonatedBy?: AutoIncrementID;
};

export type OnlinePresence = Omit<PresencePrincipal, 'tokenHash'> & {
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
