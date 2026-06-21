import { AutoIncrementID } from '@/common/types/common.type';
import {
  ClassField,
  EmailField,
  PasswordField,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class RegisterReqDto {
  @EmailField()
  email!: string;

  @PasswordField()
  password!: string;

  @ClassField(() => String)
  roleId!: AutoIncrementID;

  @StringFieldOptional()
  username?: string;
}
