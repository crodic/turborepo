import { StringField } from '@/decorators/field.decorators';

export class SocialExchangeReqDto {
  @StringField()
  token!: string;
}
