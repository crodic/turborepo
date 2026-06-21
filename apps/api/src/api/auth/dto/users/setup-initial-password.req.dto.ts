import { PasswordField } from '@/decorators/field.decorators';

export class SetupInitialPasswordReqDto {
  @PasswordField()
  password!: string;

  @PasswordField()
  confirmPassword!: string;
}
