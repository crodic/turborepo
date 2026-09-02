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
  phone?: string;

  @StringField()
  @Expose()
  email: string;

  @StringFieldOptional()
  @Expose()
  @Transform(({ obj }) => obj.adminProfile?.bio ?? obj.bio)
  bio?: string;

  @StringFieldOptional()
  @Expose()
  @Transform(({ obj }) => obj.avatarUrl ?? obj.avatar)
  avatar?: string;

  @ArrayField(RoleResDto)
  @Expose()
  roles?: WrapperType<RoleResDto>[];

  @BooleanField()
  @Transform(({ obj }) => !!obj.isEmailVerified || !!obj.verifiedAt)
  @Expose()
  verifiedAt?: boolean;

  @BooleanField()
  @Transform(({ obj }) => obj.adminProfile?.twoFactorEnabled ?? false)
  @Expose()
  twoFactorEnabled: boolean;

  @JsonField()
  @Transform(({ obj }) => obj.adminProfile?.notifications ?? true)
  @Expose()
  notifications: any;

  @ClassField(() => Date)
  @Expose()
  createdAt: Date;

  @ClassField(() => Date)
  @Expose()
  updatedAt: Date;
}
