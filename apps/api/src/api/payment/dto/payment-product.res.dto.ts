import { AutoIncrementID } from '@/common/types/common.type';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentProductResDto {
  @ApiProperty({ example: 1 })
  id!: AutoIncrementID;

  @ApiProperty({ example: 'pro' })
  planSlug!: string;

  @ApiProperty({ example: 'Pro' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Everything growing businesses and indie hackers need.',
  })
  description?: string | null;

  @ApiProperty({ example: 'monthly', enum: ['monthly', 'yearly', 'one_time'] })
  interval!: string;

  @ApiProperty({ example: 19 })
  price!: number;

  @ApiProperty({ example: 'usd' })
  currency!: string;

  @ApiPropertyOptional({
    description: 'All configured prices across currencies',
    example: [{ id: 'price_1', amount: 19, currency: 'usd' }],
  })
  prices?: Array<{
    id?: string;
    amount: number;
    currency: string;
    isArchived?: boolean;
  }>;

  @ApiProperty({ example: 'f6387289-7bfc-42cc-8e85-00d4a922dc9f' })
  polarProductId!: string;

  @ApiProperty({
    example: ['Unlimited projects', 'Priority support'],
    type: [String],
  })
  features!: string[];

  @ApiPropertyOptional({
    description: 'Custom metadata from Polar',
    type: 'object',
    additionalProperties: true,
  })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Full list of Polar benefits attached to this product',
    type: 'array',
  })
  benefits?: Array<Record<string, any>>;

  @ApiPropertyOptional({
    description: 'Product media assets (images, logos) from Polar',
    type: 'array',
  })
  medias?: Array<Record<string, any>>;

  @ApiPropertyOptional({ example: 'day' })
  trialInterval?: string | null;

  @ApiPropertyOptional({ example: 14 })
  trialIntervalCount?: number | null;

  @ApiPropertyOptional({ example: 'Most Popular' })
  badge?: string | null;

  @ApiProperty({ example: 'Upgrade to Pro' })
  ctaText!: string;

  @ApiProperty({ example: true })
  isPopular!: boolean;

  @ApiProperty({ example: false })
  isFree!: boolean;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 'public', enum: ['public', 'private'] })
  visibility!: string;

  @ApiProperty({ example: 1 })
  sortOrder!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
