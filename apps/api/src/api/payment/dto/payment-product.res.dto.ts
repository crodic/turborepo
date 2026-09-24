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

  @ApiProperty({ example: 'monthly', enum: ['monthly', 'yearly'] })
  interval!: string;

  @ApiProperty({ example: 19 })
  price!: number;

  @ApiProperty({ example: 'usd' })
  currency!: string;

  @ApiProperty({ example: 'f6387289-7bfc-42cc-8e85-00d4a922dc9f' })
  polarProductId!: string;

  @ApiProperty({
    example: ['Unlimited projects', 'Priority support'],
    type: [String],
  })
  features!: string[];

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

  @ApiProperty({ example: 1 })
  sortOrder!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
