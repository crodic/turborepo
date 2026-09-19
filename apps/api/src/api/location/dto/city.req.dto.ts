import {
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class CreateCityReqDto {
  @StringField({ maxLength: 255 })
  name: string;

  @StringFieldOptional({ nullable: true })
  stateId?: string | null;

  @StringFieldOptional({ maxLength: 10, nullable: true })
  stateCode?: string | null;

  @StringFieldOptional({ nullable: true })
  countryId?: string | null;

  @StringFieldOptional({ maxLength: 2, nullable: true })
  countryCode?: string | null;

  @StringFieldOptional({ maxLength: 10, nullable: true })
  code?: string | null;

  @NumberFieldOptional({ nullable: true })
  latitude?: number | null;

  @NumberFieldOptional({ nullable: true })
  longitude?: number | null;
}

export class UpdateCityReqDto extends CreateCityReqDto {}
