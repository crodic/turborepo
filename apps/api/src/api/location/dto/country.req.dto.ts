import {
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class CreateCountryReqDto {
  @StringField({ maxLength: 100 })
  name: string;

  @StringFieldOptional({ maxLength: 2, nullable: true })
  iso2?: string | null;

  @StringFieldOptional({ maxLength: 3, nullable: true })
  iso3?: string | null;

  @StringFieldOptional({ maxLength: 3, nullable: true })
  numericCode?: string | null;

  @StringFieldOptional({ maxLength: 20, nullable: true })
  phonecode?: string | null;

  @StringFieldOptional({ maxLength: 100, nullable: true })
  capital?: string | null;

  @StringFieldOptional({ maxLength: 10, nullable: true })
  currency?: string | null;

  @StringFieldOptional({ maxLength: 100, nullable: true })
  currencyName?: string | null;

  @StringFieldOptional({ maxLength: 20, nullable: true })
  currencySymbol?: string | null;

  @StringFieldOptional({ maxLength: 10, nullable: true })
  tld?: string | null;

  @StringFieldOptional({ maxLength: 255, nullable: true })
  native?: string | null;

  @StringFieldOptional({ maxLength: 100, nullable: true })
  subregion?: string | null;

  @NumberFieldOptional({ nullable: true })
  latitude?: number | null;

  @NumberFieldOptional({ nullable: true })
  longitude?: number | null;

  @StringFieldOptional({ nullable: true })
  regionId?: string | null;
}

export class UpdateCountryReqDto extends CreateCountryReqDto {}
