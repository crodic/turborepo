import { StringField } from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ResendEmailVerifyResDto {
  @Expose()
  @StringField()
  userId!: string;
}
