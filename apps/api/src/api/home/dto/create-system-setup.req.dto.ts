import {
  EmailField,
  PasswordField,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class CreateSystemSetupReqDto {
  @EmailField()
  email: string;

  @PasswordField()
  password: string;

  @StringFieldOptional()
  systemRoleName?: string;

  @StringFieldOptional()
  firstName?: string;

  @StringFieldOptional()
  lastName?: string;

  @StringFieldOptional()
  site_brand?: string;
}
