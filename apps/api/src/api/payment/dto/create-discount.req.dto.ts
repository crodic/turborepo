import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateDiscountReqDto {
  @ApiProperty({
    description: 'Name of the discount',
    example: 'Summer Launch Promo',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description:
      'Promo code for customers to apply at checkout (3-256 alphanumeric characters)',
    example: 'SUMMER20',
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({
    description: 'Type of discount: percentage or fixed amount',
    enum: ['percentage', 'fixed'],
    example: 'percentage',
  })
  @IsIn(['percentage', 'fixed'])
  type: 'percentage' | 'fixed';

  @ApiPropertyOptional({
    description:
      'Discount percentage in basis points (1 basis point = 0.01%, e.g. 2000 = 20%). Required if type is percentage.',
    example: 2000,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  basisPoints?: number;

  @ApiPropertyOptional({
    description:
      'Fixed amount in minor units (cents, e.g. 1000 = $10.00). Required if type is fixed.',
    example: 1000,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Currency for fixed discount',
    default: 'usd',
    example: 'usd',
  })
  @IsString()
  @IsOptional()
  currency?: string = 'usd';

  @ApiPropertyOptional({
    description: 'Fixed amounts per currency (e.g. { usd: 1000, eur: 900 })',
  })
  @IsObject()
  @IsOptional()
  amounts?: Record<string, number>;

  @ApiProperty({
    description: 'Duration of the discount',
    enum: ['once', 'forever', 'repeating'],
    example: 'once',
  })
  @IsIn(['once', 'forever', 'repeating'])
  duration: 'once' | 'forever' | 'repeating';

  @ApiPropertyOptional({
    description:
      'Number of months the discount repeats. Required if duration is repeating.',
    example: 3,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationInMonths?: number;

  @ApiPropertyOptional({
    description: 'Timestamp when the coupon becomes redeemable (ISO 8601)',
  })
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when the coupon expires (ISO 8601)',
  })
  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @ApiPropertyOptional({
    description:
      'Maximum number of times this coupon can be redeemed across all customers',
    example: 100,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxRedemptions?: number;

  @ApiPropertyOptional({
    description:
      'List of specific product IDs this discount is limited to. If omitted, applies to all products.',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  products?: string[];

  @ApiPropertyOptional({
    description: 'Custom metadata object',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, string | number | boolean>;
}
