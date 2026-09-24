import {
  BooleanFieldOptional,
  NumberField,
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateProductReqDto {
  @StringField({
    description: 'Unique plan slug identifier (e.g. starter, pro, enterprise)',
    example: 'pro',
  })
  planSlug!: string;

  @StringField({
    description: 'Display name of the plan',
    example: 'Pro',
  })
  name!: string;

  @StringFieldOptional({
    description: 'Short description of the plan benefits',
    example:
      'Everything growing businesses and indie hackers need to ship fast.',
  })
  description?: string;

  @StringField({
    description: 'Billing interval',
    example: 'monthly',
  })
  @IsIn(['monthly', 'yearly', 'one_time'])
  interval!: string;

  @NumberField({
    description: 'Price in dollars (e.g. 19 for $19)',
    example: 19,
    min: 0,
  })
  price!: number;

  @StringFieldOptional({
    description: 'Currency code',
    example: 'usd',
  })
  currency?: string;

  @StringFieldOptional({
    description:
      'Polar Product ID for automated billing (leave blank for free plan)',
    example: 'f6387289-7bfc-42cc-8e85-00d4a922dc9f',
  })
  polarProductId?: string;

  @ApiPropertyOptional({
    description: 'List of features included in this tier',
    example: [
      'Unlimited projects',
      'Priority email & chat support',
      'High-speed API limits',
    ],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @StringFieldOptional({
    description: 'Optional highlight badge text (e.g. Most Popular)',
    example: 'Most Popular',
  })
  badge?: string;

  @StringFieldOptional({
    description: 'Call-to-action button label',
    example: 'Upgrade to Pro',
  })
  ctaText?: string;

  @BooleanFieldOptional({
    description: 'Whether this plan should be highlighted as popular',
    example: true,
  })
  isPopular?: boolean;

  @BooleanFieldOptional({
    description: 'Whether this is a free tier (skips payment gateway checkout)',
    example: false,
  })
  isFree?: boolean;

  @BooleanFieldOptional({
    description: 'Whether this plan is currently active and visible to users',
    example: true,
  })
  isActive?: boolean;

  @NumberFieldOptional({
    description: 'Display sorting order',
    example: 2,
  })
  sortOrder?: number;
}
