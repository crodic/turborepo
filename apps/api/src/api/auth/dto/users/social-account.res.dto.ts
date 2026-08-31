import { EAccountProvider } from '@/constants/entity.enum';
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

  @EnumField(() => EAccountProvider)
  @Expose()
  provider!: EAccountProvider;

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
