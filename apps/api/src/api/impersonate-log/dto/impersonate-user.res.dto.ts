import { SessionResDto } from '@/api/auth/dto/session.res.dto';
import {
  ClassField,
  NumberField,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ImpersonateUserResDto {
  @StringField()
  @Expose()
  userId: string;

  @StringField()
  @Expose()
  impersonatedBy: string;

  @StringField()
  @Expose()
  accessToken: string;

  @StringField()
  @Expose()
  refreshToken: string;

  @NumberField()
  @Expose()
  tokenExpires: number;

  @ClassField(() => Date)
  @Expose()
  expiresAt: Date;

  @StringFieldOptional({ minLength: 0 })
  @Expose()
  callbackUrl?: string;

  @StringFieldOptional({ minLength: 0 })
  @Expose()
  redirectUrl?: string;

  @ClassField(() => SessionResDto)
  @Expose()
  session: SessionResDto;
}
