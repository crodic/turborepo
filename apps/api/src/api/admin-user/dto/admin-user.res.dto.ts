import { RoleResDto } from '@/api/role/dto/role.res.dto';
import { WrapperType } from '@/common/types/types';
import {
  ArrayField,
  BooleanField,
  ClassField,
  JsonField,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { ToFullUrl } from '@/decorators/transform.decorators';
import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class AdminUserResDto {
  @StringField()
  @Expose()
  id: string;

  @StringField()
  @Expose()
  firstName: string;

  @StringField()
  @Expose()
  lastName: string;

  @StringField()
  @Expose()
  fullName: string;

  @StringFieldOptional()
  @Expose()
  phone: string;

  @StringFieldOptional()
  @Expose()
  birthday?: string;

  @StringField()
  @Expose()
  email: string;

  @StringFieldOptional()
  @Expose()
  bio?: string;

  @StringField()
  @ToFullUrl()
  @Expose()
  avatar?: string;

  @ArrayField(RoleResDto)
  @Expose()
  roles?: WrapperType<RoleResDto>[];

  @BooleanField()
  @Transform(({ value }) => !!value)
  @Expose()
  verifiedAt?: boolean;

  @BooleanField()
  @Expose()
  twoFactorEnabled: boolean;

  @JsonField()
  @Expose()
  notifications: Record<string, boolean>;

  @ClassField(() => Date)
  @Expose()
  createdAt: Date;

  @ClassField(() => Date)
  @Expose()
  updatedAt: Date;
}
