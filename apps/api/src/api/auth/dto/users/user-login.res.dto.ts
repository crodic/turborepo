import { NumberField, StringField } from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';
import { LoginResDto } from '../login.res.dto';

@Exclude()
export class UserLoginResDto extends LoginResDto {
  @Expose()
  @StringField()
  declare accessToken: string;

  @Expose()
  @StringField()
  declare refreshToken: string;

  @Expose()
  @NumberField()
  declare tokenExpires: number;
}
