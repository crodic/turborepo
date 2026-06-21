import { StringField } from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class LogUserResDto {
  @StringField()
  @Expose()
  id: string;

  @StringField()
  @Expose()
  email: string;

  @StringField()
  @Expose()
  fullName: string;
}
