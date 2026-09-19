import { StringField } from '@/decorators/field.decorators';

export class CreateRegionReqDto {
  @StringField({ maxLength: 255 })
  name: string;
}

export class UpdateRegionReqDto {
  @StringField({ maxLength: 255 })
  name: string;
}
