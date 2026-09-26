import {
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateDiscountReqDto {
  @StringField({
    description: 'Name of the discount shown to customers',
    example: 'Summer Sale 20% Off',
  })
  name!: string;

  @StringField({
    description: 'Type of discount (fixed or percentage)',
    example: 'percentage',
  })
  @IsIn(['fixed', 'percentage'])
  type!: 'fixed' | 'percentage';

  @NumberFieldOptional({
    description: 'Fixed discount amount in cents (for fixed type)',
    example: 1000,
    min: 1,
  })
  amount?: number;

  @NumberFieldOptional({
    description: 'Percentage discount in basis points (1000 = 10%)',
    example: 2000,
    min: 1,
    max: 10000,
  })
  basisPoints?: number;

  @StringFieldOptional({
    description: 'Currency code for fixed discounts (e.g. usd)',
    example: 'usd',
  })
  currency?: string;

  @StringFieldOptional({
    description: 'Coupon code customers use at checkout',
    example: 'SUMMER20',
  })
  code?: string;

  @StringField({
    description: 'Duration of the discount: once, forever, or repeating',
    example: 'once',
  })
  @IsIn(['once', 'forever', 'repeating'])
  duration!: 'once' | 'forever' | 'repeating';

  @NumberFieldOptional({
    description: 'Number of months discount repeats for repeating duration',
    example: 3,
    min: 1,
  })
  durationInMonths?: number;

  @NumberFieldOptional({
    description: 'Maximum number of redemptions allowed across all customers',
    example: 100,
    min: 1,
  })
  maxRedemptions?: number;

  @StringFieldOptional({
    description: 'Start date from when discount is valid (ISO string)',
    example: '2026-06-01T00:00:00Z',
  })
  startsAt?: string;

  @StringFieldOptional({
    description: 'End date after which discount expires (ISO string)',
    example: '2026-08-31T23:59:59Z',
  })
  endsAt?: string;

  @ApiPropertyOptional({
    description: 'Array of specific product IDs this discount is restricted to',
    example: ['prod_123', 'prod_456'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @ApiPropertyOptional({
    description: 'Optional metadata key-value pairs',
    example: { campaign: 'summer_promo' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
