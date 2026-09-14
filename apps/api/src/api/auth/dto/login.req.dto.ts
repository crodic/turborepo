import { EmailField, PasswordField } from '@/decorators/field.decorators';

export class LoginReqDto {
  @EmailField({ toLowerCase: false })
  email!: string;

  @PasswordField()
  password!: string;
}
