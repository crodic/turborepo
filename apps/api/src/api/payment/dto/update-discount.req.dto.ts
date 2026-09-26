import {
  NumberFieldOptional,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateDiscountReqDto {
  @StringFieldOptional({
    description: 'Name of the discount shown to customers',
    example: 'Summer Sale 20% Off',
  })
  name?: string;

  @StringFieldOptional({
    description: 'Coupon code customers use at checkout',
    example: 'SUMMER20_NEW',
  })
  code?: string;

  @NumberFieldOptional({
    description: 'Maximum number of redemptions allowed across all customers',
    example: 200,
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
    example: '2026-09-30T23:59:59Z',
  })
  endsAt?: string;

  @ApiPropertyOptional({
    description: 'Array of specific product IDs this discount is restricted to',
    example: ['prod_123'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @ApiPropertyOptional({
    description: 'Optional metadata key-value pairs',
    example: { campaign: 'summer_promo_extended' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
