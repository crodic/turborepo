import { WrapperType } from '@/common/types/types';
import { ClassField, StringField } from '@/decorators/field.decorators';
import { AdminUserResDto } from './admin-user.res.dto';

export class ChangePasswordResDto {
  @StringField()
  message: string;

  @ClassField(() => AdminUserResDto)
  user: WrapperType<AdminUserResDto>;
}
