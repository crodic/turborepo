import {
  ClassField,
  ClassFieldOptional,
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';
import { CountryResDto } from './country.res.dto';

@Exclude()
export class StateResDto {
  @StringField()
  @Expose()
  id: string;

  @StringField()
  @Expose()
  name: string;

  @StringField()
  @Expose()
  countryId: string;

  @StringFieldOptional({ nullable: true })
  @Expose()
  countryCode?: string | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  iso2?: string | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  iso3166_2?: string | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  type?: string | null;

  @NumberFieldOptional({ nullable: true })
  @Expose()
  latitude?: number | null;

  @NumberFieldOptional({ nullable: true })
  @Expose()
  longitude?: number | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  timezone?: string | null;

  @ClassFieldOptional(() => CountryResDto, { nullable: true })
  @Expose()
  country?: CountryResDto | null;

  @ClassField(() => Date)
  @Expose()
  createdAt: Date;

  @ClassField(() => Date)
  @Expose()
  updatedAt: Date;
}
