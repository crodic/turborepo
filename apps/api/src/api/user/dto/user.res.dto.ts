import { AutoIncrementID } from '@/common/types/common.type';
import {
  BooleanField,
  ClassField,
  JsonField,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose, Transform } from 'class-transformer';

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
