import {
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class ForgotPasswordResDto {
  @StringField({
    example: 'A password reset link has been sent to your email.',
  })
  message!: string;

  @StringFieldOptional({
    swagger: false,
  })
  redirect?: string;
}
