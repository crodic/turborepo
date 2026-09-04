import { AutoIncrementID } from '@/common/types/common.type';
import { EAccountProvider } from '@/constants/entity.enum';
import {
  ArrayFieldOptional,
  BooleanField,
  ClassField,
  EnumField,
  JsonField,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class UserAccountResDto {
  @StringField()
  @Expose()
  id: string;

  @EnumField(() => EAccountProvider)
  @Expose()
  provider: EAccountProvider;

  @StringFieldOptional()
  @Expose()
  providerAccountId?: string;
}

@Exclude()
export class UserResDto {
  @StringField()
  @Expose()
  id: AutoIncrementID;

  @StringField()
  @Expose()
  firstName: string;

  @StringFieldOptional()
  @Expose()
  lastName?: string;

  @StringField()
  @Expose()
  fullName: string;

  @StringField()
  @Expose()
  email: string;

  @StringFieldOptional()
  @Expose()
  @Transform(({ obj }) => obj.avatarUrl ?? obj.avatar)
  avatar?: string;

  @BooleanField()
  @Expose()
  hasPassword: boolean;

  @ArrayFieldOptional(UserAccountResDto)
  @Expose()
  accounts?: UserAccountResDto[];

  @JsonField()
  @Transform(({ obj }) => obj.userProfile?.notifications ?? true)
  @Expose()
  notifications: any;

  @BooleanField()
  @Transform(({ obj }) => !!obj.isEmailVerified || !!obj.verifiedAt)
  @Expose()
  verifiedAt?: boolean;

  @ClassField(() => Date)
  @Expose()
  createdAt: Date;

  @ClassField(() => Date)
  @Expose()
  updatedAt: Date;
}
