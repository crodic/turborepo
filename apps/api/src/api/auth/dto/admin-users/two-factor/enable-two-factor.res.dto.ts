import { ArrayField, StringField } from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class EnableTwoFactorResDto {
  @Expose()
  @StringField()
  totpUri!: string;

  @Expose()
  @ArrayField(String)
  backupCodes!: string[];
}
