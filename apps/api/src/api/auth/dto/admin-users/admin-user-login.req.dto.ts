import { EmailField, PasswordField } from '@/decorators/field.decorators';
import { LoginReqDto } from '../login.req.dto';

export class AdminUserLoginReqDto extends LoginReqDto {
  @EmailField({ toLowerCase: false, default: 'admin@email.com' })
  declare email: string;

  @PasswordField({ default: 'admin@2025' })
  declare password: string;
}
