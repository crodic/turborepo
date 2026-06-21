import { BooleanField, StringField } from '@/decorators/field.decorators';

export class ResetPasswordResDto {
  @BooleanField()
  success!: boolean;

  @StringField()
  message!: string;
}
