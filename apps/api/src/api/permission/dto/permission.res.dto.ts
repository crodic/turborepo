import { DomainType } from '@/constants/entity.enum';
import {
  ClassField,
  EnumFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class PermissionResDto {
  @StringField()
  @Expose()
  id: string;

  @StringField()
  @Expose()
  name: string;

  @StringField()
  @Expose()
  group: string;

  @StringFieldOptional()
  @Expose()
  description?: string;

  @StringField()
  @Expose()
  key: string;

  @EnumFieldOptional(() => DomainType)
  @Expose()
  domain?: DomainType;

  @ClassField(() => Date)
  @Expose()
  createdAt: Date;

  @ClassField(() => Date)
  @Expose()
  updatedAt: Date;
}
