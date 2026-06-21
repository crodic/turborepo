import { StringField } from '@/decorators/field.decorators';

export class VerifyTwoFactorSetupReqDto {
  @StringField({ minLength: 6, maxLength: 12 })
  code!: string;
}
