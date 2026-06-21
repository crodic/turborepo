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
