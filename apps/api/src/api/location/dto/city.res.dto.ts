import {
  ClassField,
  ClassFieldOptional,
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';
import { CountryResDto } from './country.res.dto';
import { StateResDto } from './state.res.dto';

@Exclude()
export class CityResDto {
  @StringField()
  @Expose()
  id: string;

  @StringField()
  @Expose()
  name: string;

  @StringFieldOptional({ nullable: true })
  @Expose()
  stateId?: string | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  stateCode?: string | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  countryId?: string | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  countryCode?: string | null;

  @StringFieldOptional({ nullable: true })
  @Expose()
  code?: string | null;

  @NumberFieldOptional({ nullable: true })
  @Expose()
  latitude?: number | null;

  @NumberFieldOptional({ nullable: true })
  @Expose()
  longitude?: number | null;

  @ClassFieldOptional(() => StateResDto, { nullable: true })
  @Expose()
  state?: StateResDto | null;

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
