import { PasswordField } from '@/decorators/field.decorators';

export class ChangePasswordReqDto {
  @PasswordField()
  password: string;

  @PasswordField()
  newPassword: string;

  @PasswordField()
  confirmNewPassword: string;
}
