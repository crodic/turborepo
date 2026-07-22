import {
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CmsPageTranslationResDto {
  @StringField()
  @Expose()
  locale: string;

  @StringFieldOptional()
  @Expose()
  slug?: string;

  @StringField()
  @Expose()
  title: string;

  @StringField()
  @Expose()
  content: string;

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
}
