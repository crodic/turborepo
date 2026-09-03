import {
  EmailField,
  PasswordField,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class RegisterReqDto {
  @StringField()
  firstName!: string;

  @StringFieldOptional()
  lastName?: string;

  @EmailField()
  email!: string;

  @PasswordField()
  password!: string;
}
