import { StringField } from '@/decorators/field.decorators';

export class ImpersonationExchangeReqDto {
  @StringField()
  token!: string;
}
