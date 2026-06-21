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

  @BooleanFieldOptional()
  remove_site_logo?: boolean | string;

  @BooleanFieldOptional()
  remove_site_dark_logo?: boolean | string;

  @BooleanFieldOptional()
  remove_site_favicon?: boolean | string;
}
