import {
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class CreateStateReqDto {
  @StringField({ maxLength: 255 })
  name: string;

  @StringField()
  countryId: string;

  @StringFieldOptional({ maxLength: 2, nullable: true })
  countryCode?: string | null;

  @StringFieldOptional({ maxLength: 10, nullable: true })
  iso2?: string | null;

  @StringFieldOptional({ maxLength: 10, nullable: true })
  iso3166_2?: string | null;

  @StringFieldOptional({ maxLength: 191, nullable: true })
  type?: string | null;

  @NumberFieldOptional({ nullable: true })
  latitude?: number | null;

  @NumberFieldOptional({ nullable: true })
  longitude?: number | null;

  @StringFieldOptional({ maxLength: 255, nullable: true })
  timezone?: string | null;
}

export class UpdateStateReqDto extends CreateStateReqDto {}
