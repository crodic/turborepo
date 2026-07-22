import {
  ClassField,
  DateFieldOptional,
  EnumField,
  StringField,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';
import { ECmsPageStatus } from '../entities/cms-page.entity';
import { CmsPageTranslationResDto } from './cms-page-translation.res.dto';

@Exclude()
export class CmsPageResDto {
  @StringField()
  @StringField()
  @Expose()
  id: string;

  @EnumField(() => ECmsPageStatus)
  @Expose()
  status: ECmsPageStatus;

  @ClassField(() => CmsPageTranslationResDto, { isArray: true })
  @Expose()
  translations: CmsPageTranslationResDto[];

  @DateFieldOptional()
  @Expose()
  publishedAt?: Date | null;

  @ClassField(() => Date)
  @Expose()
  createdAt: Date;

  @ClassField(() => Date)
  @Expose()
  updatedAt: Date;
}
