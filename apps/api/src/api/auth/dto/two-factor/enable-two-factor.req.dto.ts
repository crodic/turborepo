import { PasswordField } from '@/decorators/field.decorators';

export class EnableTwoFactorReqDto {
  @PasswordField()
  password!: string;
}
