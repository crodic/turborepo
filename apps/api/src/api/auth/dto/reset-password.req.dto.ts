import { PasswordField } from '@/decorators/field.decorators';

export class ResetPasswordReqDto {
  @PasswordField()
  password!: string;

  @PasswordField()
  confirmPassword!: string;
}
