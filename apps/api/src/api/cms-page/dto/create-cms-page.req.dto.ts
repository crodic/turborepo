import {
  EnumFieldOptional,
  JsonField,
  JsonFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { ECmsPageStatus } from '../entities/cms-page.entity';

export class CreateCmsPageReqDto {
  @StringField({ maxLength: 255 })
  title: string;

  @StringFieldOptional({ maxLength: 255 })
  slug?: string;

  @EnumFieldOptional(() => ECmsPageStatus)
  status?: ECmsPageStatus;

  @JsonField()
  content: Record<string, unknown>;

  @JsonFieldOptional({ each: true })
  variables?: unknown[];

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
