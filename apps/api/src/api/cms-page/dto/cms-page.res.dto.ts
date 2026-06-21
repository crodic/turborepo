import {
  ClassField,
  DateFieldOptional,
  EnumField,
  JsonField,
  JsonFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';
import { ECmsPageStatus } from '../entities/cms-page.entity';

@Exclude()
export class CmsPageResDto {
  @StringField()
  @Expose()
  id: string;

  @StringField()
  @Expose()
  title: string;

  @StringField()
  @Expose()
  slug: string;

  @EnumField(() => ECmsPageStatus)
  @Expose()
  status: ECmsPageStatus;

  @JsonField()
  @Expose()
  content: Record<string, unknown>;

  @JsonFieldOptional({ each: true })
  @Expose()
  variables?: unknown[];

  @StringFieldOptional()
  @Expose()
  seoTitle?: string;

  @StringFieldOptional()
  @Expose()
  seoDescription?: string;

  @StringFieldOptional()
  @Expose()
  seoKeywords?: string;

  @StringFieldOptional()
  @Expose()
  ogTitle?: string;

  @StringFieldOptional()
  @Expose()
  ogDescription?: string;

  @StringFieldOptional()
  @Expose()
  ogImage?: string;

  @StringFieldOptional()
  @Expose()
  canonicalUrl?: string;

  @StringFieldOptional()
  @Expose()
  robots?: string;

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
