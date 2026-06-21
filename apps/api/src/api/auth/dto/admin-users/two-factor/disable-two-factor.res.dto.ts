import { BooleanField, StringField } from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class DisableTwoFactorResDto {
  @Expose()
  @BooleanField()
  enabled!: boolean;

  @Expose()
  @StringField()
  message!: string;
}
