import { LogUserResDto } from '@/api/audit-log/dto/log-user.res.dto';
import { EImpersonateHistoryStatus } from '@/constants/entity.enum';
import {
  ClassField,
  ClassFieldOptional,
  EnumField,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';
import { ImpersonateLogResDto } from './impersonate-log.res.dto';

@Exclude()
export class ImpersonateLogHistoryResDto {
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
  reason: string;

  @EnumField(() => EImpersonateHistoryStatus)
  @Expose()
  status: EImpersonateHistoryStatus;

  @StringFieldOptional()
  @Expose()
  ipAddress?: string;

  @StringFieldOptional()
  @Expose()
  userAgent?: string;

  @ClassField(() => Date)
  @Expose()
  startedAt: Date;

  @ClassField(() => Date)
  @Expose()
  stoppedAt?: Date;

  @ClassField(() => Date)
  @Expose()
  expiresAt?: Date;

  @ClassField(() => Date)
  @Expose()
  createdAt: Date;

  @Expose()
  itemsCount?: number;

  @ClassFieldOptional(() => LogUserResDto, { nullable: true })
  @Expose()
  admin?: LogUserResDto | null;

  @ClassFieldOptional(() => LogUserResDto, { nullable: true })
  @Expose()
  targetUser?: LogUserResDto | null;

  @Expose()
  items?: ImpersonateLogResDto[];
}
