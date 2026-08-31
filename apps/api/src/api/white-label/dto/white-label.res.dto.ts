import { AutoIncrementID } from '@/common/types/common.type';
import { EWhiteLabelTarget } from '@/constants/entity.enum';
import { ToFullUrl } from '@/decorators/transform.decorators';
import { Expose } from 'class-transformer';
import { WhiteLabelStyles } from '../entities/white-label.entity';

export class WhiteLabelResDto {
  @Expose()
  id: AutoIncrementID;

  @Expose()
  slug: string;

  @Expose()
  name: string;

  @Expose()
  description?: string | null;

  @Expose()
  target: EWhiteLabelTarget;

  @Expose()
  isActive: boolean;

  @Expose()
  brandName?: string | null;

  @Expose()
  siteTitle?: string | null;

  @Expose()
  siteTagline?: string | null;

  @Expose()
  copyrightText?: string | null;

  @Expose()
  @ToFullUrl()
  siteLogo?: string | null;

  @Expose()
  @ToFullUrl()
  siteDarkLogo?: string | null;

  @Expose()
  @ToFullUrl()
  siteFavicon?: string | null;

  @Expose()
  @ToFullUrl()
  ogImage?: string | null;

  @Expose()
  @ToFullUrl()
  twitterImage?: string | null;

  @Expose()
  metaTitle?: string | null;

  @Expose()
  metaDescription?: string | null;

  @Expose()
  canonicalUrl?: string | null;

  @Expose()
  styles: WhiteLabelStyles;

  @Expose()
  createdByAdminId?: AutoIncrementID | null;

  @Expose()
  updatedByAdminId?: AutoIncrementID | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
