import { StringField, TokenField } from '@/decorators/field.decorators';

export class VerifyTwoFactorLoginReqDto {
  @TokenField()
  twoFactorToken!: string;

  @StringField({ minLength: 6, maxLength: 16 })
  code!: string;
}
