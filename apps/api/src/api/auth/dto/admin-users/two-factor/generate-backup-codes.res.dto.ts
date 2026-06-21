import { ArrayField } from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class GenerateBackupCodesResDto {
  @Expose()
  @ArrayField(String)
  backupCodes!: string[];
}
