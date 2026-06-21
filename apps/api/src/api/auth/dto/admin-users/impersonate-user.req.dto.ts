import {
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class ImpersonateUserReqDto {
  @StringField()
  userId: string;

  @StringFieldOptional({ minLength: 0 })
  callbackUrl?: string;
}
