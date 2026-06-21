import { WrapperType } from '@/common/types/types';
import { ClassField, StringField } from '@/decorators/field.decorators';
import { UserResDto } from './user.res.dto';

export class UserChangePasswordResDto {
  @StringField()
  message: string;

  @ClassField(() => UserResDto)
  user: WrapperType<UserResDto>;
}
