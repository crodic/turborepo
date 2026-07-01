import { ESessionUserType } from '@/constants/entity.enum';
import {
  BooleanField,
  ClassField,
  EnumField,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class SessionResDto {
  @StringField()
  @Expose()
  id: string;

  @StringField()
  @Expose()
  userId: string;

  @EnumField(() => ESessionUserType)
  @Expose()
  userType: ESessionUserType;

  @StringFieldOptional()
  @Expose()
  impersonatedBy?: string;

  @StringFieldOptional()
  @Expose()
  ipAddress?: string;

  @StringFieldOptional()
  @Expose()
  userAgent?: string;

  @BooleanField()
  @Expose()
  isSuspicious: boolean;

  @StringFieldOptional({ each: true })
  @Expose()
  suspiciousReasons?: string[] | null;

  @ClassField(() => Date, { required: false, nullable: true })
  @Expose()
  expiresAt?: Date;

  @ClassField(() => Date, { required: false, nullable: true })
  @Expose()
  revokedAt?: Date;

  @ClassField(() => Date)
  @Expose()
  createdAt: Date;

  @BooleanField()
  @Expose()
  isCurrent: boolean;
}
