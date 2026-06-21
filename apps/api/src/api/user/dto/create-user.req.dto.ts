import {
  EmailField,
  PasswordField,
  StringField,
} from '@/decorators/field.decorators';
import { Trim } from '@/decorators/transform.decorators';

export class CreateUserReqDto {
  @StringField()
  @Trim()
  firstName: string;

  @StringField()
  @Trim()
  lastName: string;

  @EmailField()
  email: string;

  @PasswordField()
  password: string;

  @PasswordField()
  confirmPassword: string;
}
