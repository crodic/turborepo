import {
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class CmsPageTranslationDto {
  @StringField({ maxLength: 10 })
  locale: string;

  @StringFieldOptional({ maxLength: 255 })
  slug?: string;

  @StringField({ maxLength: 255 })
  title: string;

  @StringField()
  content: string;

  @StringFieldOptional({ maxLength: 255 })
  seoTitle?: string;

  @StringFieldOptional({ maxLength: 500 })
  seoDescription?: string;

  @StringFieldOptional({ maxLength: 500 })
  seoKeywords?: string;

  @StringFieldOptional({ maxLength: 255 })
  ogTitle?: string;

  @StringFieldOptional({ maxLength: 500 })
  ogDescription?: string;

  @StringFieldOptional({ maxLength: 500 })
  ogImage?: string;

  @StringFieldOptional({ maxLength: 500 })
  canonicalUrl?: string;

  @StringFieldOptional({ maxLength: 100 })
  robots?: string;
}
