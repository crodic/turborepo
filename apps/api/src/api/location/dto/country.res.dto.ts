import {
  ClassField,
  ClassFieldOptional,
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';
import { RegionResDto } from './region.res.dto';

@Exclude()
export class CountryResDto {
  @StringField()
  @Expose()
  id: string;

  @StringField()
  @Expose()
  name: string;

  @StringFieldOptional({ nullable: true })
  @Expose()
  iso2?: string | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  iso3?: string | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  numericCode?: string | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  phonecode?: string | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  capital?: string | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  currency?: string | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  currencyName?: string | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  currencySymbol?: string | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  tld?: string | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  native?: string | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  subregion?: string | null;

  @NumberFieldOptional({ nullable: true })
  @Expose()
  latitude?: number | null;

  @NumberFieldOptional({ nullable: true })
  @Expose()
  longitude?: number | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  regionId?: string | null;

  @ClassFieldOptional(() => RegionResDto, { nullable: true })
  @Expose()
  region?: RegionResDto | null;

  @ClassField(() => Date)
  @Expose()
  createdAt: Date;

  @ClassField(() => Date)
  @Expose()
  updatedAt: Date;
}
