import { PasswordField } from '@/decorators/field.decorators';

export class UserChangePasswordReqDto {
  @PasswordField()
  password: string;

  @PasswordField()
  newPassword: string;

  @PasswordField()
  confirmNewPassword: string;
}
