import { PasswordField } from '@/decorators/field.decorators';

export class DisableTwoFactorReqDto {
  @PasswordField()
  password!: string;
}
