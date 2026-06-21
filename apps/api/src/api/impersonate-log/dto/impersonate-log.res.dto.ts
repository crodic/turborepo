import { EImpersonateLogStatus } from '@/constants/entity.enum';
import {
  ClassField,
  EnumField,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ImpersonateLogResDto {
  @StringField()
  @Expose()
  id: string;

  @StringField()
  @Expose()
  sessionId: string;

  @StringField()
  @Expose()
  adminId: string;

  @StringField()
  @Expose()
  targetUserId: string;

  @StringField()
  @Expose()
  action: string;

  @StringField()
  @Expose()
  method: string;

  @StringField()
  @Expose()
  endpoint: string;

  @StringFieldOptional()
  @Expose()
  entityType?: string;

  @StringFieldOptional()
  @Expose()
  entityId?: string;

  @EnumField(() => EImpersonateLogStatus)
  @Expose()
  status: EImpersonateLogStatus;

  @StringFieldOptional()
  @Expose()
  errorMessage?: string;

  @StringFieldOptional()
  @Expose()
  ipAddress?: string;

  @StringFieldOptional()
  @Expose()
  userAgent?: string;

  @Expose()
  input?: any;

  @Expose()
  output?: any;

  @Expose()
  before?: any;

  @Expose()
  after?: any;

  @Expose()
  changedFields?: any;

  @Expose()
  admin?: any;

  @Expose()
  targetUser?: any;

  @ClassField(() => Date)
  @Expose()
  createdAt: Date;
}
