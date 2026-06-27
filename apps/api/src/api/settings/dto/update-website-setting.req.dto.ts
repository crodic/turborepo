import {
  BooleanFieldOptional,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class UpdateWebsiteSettingReqDto {
  @StringFieldOptional()
  site_brand?: string;

  @StringFieldOptional()
  site_title?: string;

  @StringFieldOptional()
  site_tagline?: string;

  @StringFieldOptional()
  meta_title?: string;

  @StringFieldOptional()
  meta_description?: string;

  @StringFieldOptional()
  canonical_url?: string;

  @StringFieldOptional()
  og_title?: string;

  @StringFieldOptional()
  og_description?: string;

  @StringFieldOptional()
  twitter_title?: string;

  @StringFieldOptional()
  twitter_description?: string;

  @BooleanFieldOptional()
  remove_site_logo?: boolean | string;

  @BooleanFieldOptional()
  remove_site_dark_logo?: boolean | string;

  @BooleanFieldOptional()
  remove_site_favicon?: boolean | string;

  @BooleanFieldOptional()
  remove_og_image?: boolean | string;

  @BooleanFieldOptional()
  remove_twitter_image?: boolean | string;
}
