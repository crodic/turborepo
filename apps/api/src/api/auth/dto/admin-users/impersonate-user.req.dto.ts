import {
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class ImpersonateUserReqDto {
  @StringField()
  userId: string;

  @StringField({ maxLength: 500 })
  reason: string;

  @StringFieldOptional({ minLength: 0 })
  callbackUrl?: string;
}
