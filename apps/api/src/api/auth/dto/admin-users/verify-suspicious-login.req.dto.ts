import { StringField, TokenField } from '@/decorators/field.decorators';

export class VerifySuspiciousLoginReqDto {
  @TokenField()
  suspiciousLoginToken!: string;

  @StringField({ minLength: 4, maxLength: 16 })
  code!: string;

  @StringField({ minLength: 4, maxLength: 16 })
  method!: string;
}
