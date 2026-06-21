import { StringField } from '@/decorators/field.decorators';

export class ForgotPasswordResDto {
  @StringField()
  redirect!: string;
}
