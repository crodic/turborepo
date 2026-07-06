import { AutoIncrementID } from '@/common/types/common.type';
import { EThemeStatus } from '@/constants/entity.enum';
import { Expose } from 'class-transformer';
import { ThemeStyles } from '../entities/theme.entity';

export class ThemeResDto {
  @Expose()
  id: AutoIncrementID;

  @Expose()
  slug: string;

  @Expose()
  name: string;

  @Expose()
  description?: string | null;

  @Expose()
  styles: ThemeStyles;

  @Expose()
  status: EThemeStatus;

  @Expose()
  isDefault: boolean;

  @Expose()
  isAdminDefault: boolean;

  @Expose()
  createdByAdminId?: AutoIncrementID | null;

  @Expose()
  updatedByAdminId?: AutoIncrementID | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
