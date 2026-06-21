import { EmailField, PasswordField } from '@/decorators/field.decorators';

export class AdminUserLoginReqDto {
  @EmailField({ toLowerCase: false, default: 'admin@email.com' })
  email!: string;

  @PasswordField({ default: 'admin@2025' })
  password!: string;
}
