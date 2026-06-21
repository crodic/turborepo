import { EOAuthProvider } from '@/constants/entity.enum';
import {
  BooleanField,
  EnumField,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class SocialAccountResDto {
  @StringField()
  @Expose()
  id!: string;

  @EnumField(() => EOAuthProvider)
  @Expose()
  provider!: EOAuthProvider;

  @StringFieldOptional()
  @Expose()
  email?: string;

  @BooleanField()
  @Expose()
  emailVerified!: boolean;

  @StringFieldOptional()
  @Expose()
  displayName?: string;

  @StringFieldOptional()
  @Expose()
  avatarUrl?: string;
}
