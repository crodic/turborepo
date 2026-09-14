import {
  ArrayField,
  BooleanFieldOptional,
  TokenFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';
import { LoginResDto } from '../login.res.dto';

@Exclude()
export class AdminUserLoginResDto extends LoginResDto {
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
  restoreAccountRequired?: boolean;

  @Expose()
  @TokenFieldOptional()
  restoreToken?: string;
}
