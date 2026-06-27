import { StringFieldOptional } from '@/decorators/field.decorators';
import { ToFullUrl } from '@/decorators/transform.decorators';
import { Expose } from 'class-transformer';

export class WebsiteSettingResDto {
  @StringFieldOptional()
  @Expose()
  site_brand?: string;

  @StringFieldOptional()
  @Expose()
  site_title?: string;

  @StringFieldOptional()
  @Expose()
  site_tagline?: string;

  @StringFieldOptional()
  @Expose()
  meta_title?: string;

  @StringFieldOptional()
  @Expose()
  meta_description?: string;

  @StringFieldOptional()
  @Expose()
  canonical_url?: string;

  @StringFieldOptional()
  @Expose()
  og_title?: string;

  @StringFieldOptional()
  @Expose()
  og_description?: string;

  @StringFieldOptional()
  @ToFullUrl()
  @Expose()
  og_image?: string;

  @StringFieldOptional()
  @Expose()
  twitter_title?: string;

  @StringFieldOptional()
  @Expose()
  twitter_description?: string;

  @StringFieldOptional()
  @ToFullUrl()
  @Expose()
  twitter_image?: string;

  @StringFieldOptional()
  @ToFullUrl()
  @Expose()
  site_logo?: string;

  @StringFieldOptional()
  @ToFullUrl()
  @Expose()
  site_dark_logo?: string;

  @StringFieldOptional()
  @ToFullUrl()
  @Expose()
  site_favicon?: string;

  @StringFieldOptional()
  @Expose()
  backend_version?: string;
}
