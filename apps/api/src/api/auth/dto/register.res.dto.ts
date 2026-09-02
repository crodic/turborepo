import {
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class RegisterResDto {
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
}
