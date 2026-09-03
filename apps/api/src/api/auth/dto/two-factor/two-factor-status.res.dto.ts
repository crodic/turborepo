import { BooleanField } from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class TwoFactorStatusResDto {
  @Expose()
  @BooleanField()
  enabled!: boolean;
}
