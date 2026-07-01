import {
  ArrayField,
  BooleanFieldOptional,
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
  TokenFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class AdminUserLoginResDto {
  @Expose()
  @StringField()
  userId!: string;

  @Expose()
  @StringFieldOptional()
  accessToken?: string;

  @Expose()
  @StringFieldOptional()
  refreshToken?: string;

  @Expose()
  @NumberFieldOptional()
  tokenExpires?: number;

  @Expose()
  @BooleanFieldOptional()
  twoFactorRequired?: boolean;

  @Expose()
  @TokenFieldOptional()
  twoFactorToken?: string;

  @Expose()
  @ArrayField(String, { required: false })
  twoFactorMethods?: string[];

  @Expose()
  @BooleanFieldOptional()
  suspiciousLoginRequired?: boolean;

  @Expose()
  @TokenFieldOptional()
  suspiciousLoginToken?: string;

  @Expose()
  @ArrayField(String, { required: false })
  suspiciousLoginMethods?: string[];

  @Expose()
  @ArrayField(String, { required: false })
  suspiciousReasons?: string[];
}
