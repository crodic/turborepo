import { AutoIncrementID } from '@/common/types/common.type';
import { EAccountProvider } from '@/constants/entity.enum';

export interface IAuthUser {
  id: AutoIncrementID;
  email: string;
  firstName: string;
  lastName?: string;
  fullName: string;
  password?: string;
  avatar?: string;
  deletedAt?: Date;
  verifiedAt?: Date;
  notifications?: Record<string, boolean>;
}

export interface IAuthAccount {
  id: AutoIncrementID;
  provider: EAccountProvider;
  providerAccountId: string;
  password?: string;
}
