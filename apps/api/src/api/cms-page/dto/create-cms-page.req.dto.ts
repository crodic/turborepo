import {
  EnumFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { ECmsPageStatus } from '../entities/cms-page.entity';

export class CreateCmsPageReqDto {
  @StringField({ maxLength: 255 })
  title: string;

  @StringFieldOptional({ maxLength: 255 })
  slug?: string;

  @StringField({ maxLength: 10 })
  locale: string;

  @EnumFieldOptional(() => ECmsPageStatus)
  status?: ECmsPageStatus;

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
