import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ProductPriceInputDto {
  @ApiPropertyOptional({
    description: 'Type of price: fixed amount or custom pay-what-you-want',
    enum: ['fixed', 'custom'],
    default: 'fixed',
  })
  @IsIn(['fixed', 'custom'])
  @IsOptional()
  amountType?: 'fixed' | 'custom' = 'fixed';

  @ApiPropertyOptional({
    description:
      'Price amount in cents (e.g. 2900 = $29.00). Required if amountType is fixed.',
    example: 2900,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  priceAmount?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    default: 'usd',
    example: 'usd',
  })
  @IsString()
  @IsOptional()
  priceCurrency?: string = 'usd';

  @ApiPropertyOptional({
    description: 'Tax behavior',
    enum: ['location', 'inclusive', 'exclusive'],
    default: 'location',
  })
  @IsIn(['location', 'inclusive', 'exclusive'])
  @IsOptional()
  taxBehavior?: 'location' | 'inclusive' | 'exclusive';

  @ApiPropertyOptional({
    description: 'Minimum amount for custom price (in cents)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minimumAmount?: number;

  @ApiPropertyOptional({
    description: 'Maximum amount for custom price (in cents)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maximumAmount?: number;

  @ApiPropertyOptional({
    description: 'Preset suggested amount for custom price (in cents)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  presetAmount?: number;
}

export class CreateProductReqDto {
  @ApiProperty({
    description: 'The name of the product',
    example: 'Pro Subscription',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'The description of the product (supports markdown)',
    example: 'Full access to premium AI features and developer APIs.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Product visibility',
    enum: ['public', 'private', 'draft'],
    default: 'public',
  })
  @IsIn(['public', 'private', 'draft'])
  @IsOptional()
  visibility?: 'public' | 'private' | 'draft' = 'public';

  @ApiPropertyOptional({
    description: 'Whether the product is a recurring subscription',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean = true;

  @ApiPropertyOptional({
    description: 'Recurring interval unit',
    enum: ['month', 'year'],
    default: 'month',
  })
  @IsIn(['month', 'year'])
  @IsOptional()
  recurringInterval?: 'month' | 'year' = 'month';

  @ApiPropertyOptional({
    description:
      'Number of interval units (e.g. 1 for every month, 3 for quarterly)',
    default: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  recurringIntervalCount?: number = 1;

  @ApiPropertyOptional({
    description: 'Cadence for meter reset and overage settlement',
    enum: ['month', 'year'],
  })
  @IsIn(['month', 'year'])
  @IsOptional()
  meterInterval?: 'month' | 'year';

  @ApiPropertyOptional({
    description: 'Number of meter interval units',
    example: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  meterIntervalCount?: number;

  @ApiPropertyOptional({
    description: 'Trial period interval unit',
    enum: ['day', 'week', 'month', 'year'],
  })
  @IsIn(['day', 'week', 'month', 'year'])
  @IsOptional()
  trialInterval?: 'day' | 'week' | 'month' | 'year';

  @ApiPropertyOptional({
    description: 'Number of trial interval units',
    example: 7,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  trialIntervalCount?: number;

  @ApiPropertyOptional({
    description: 'List of available prices for this product',
    type: [ProductPriceInputDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPriceInputDto)
  @IsOptional()
  prices?: ProductPriceInputDto[];

  @ApiPropertyOptional({
    description:
      'Shorthand price amount in minor units (cents, e.g. 2900 = $29.00)',
    example: 2900,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  priceAmount?: number;

  @ApiPropertyOptional({
    description: 'Shorthand currency code',
    default: 'usd',
    example: 'usd',
  })
  @IsString()
  @IsOptional()
  currency?: string = 'usd';

  @ApiPropertyOptional({
    description: 'List of product media file IDs uploaded on Polar',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  medias?: string[];

  @ApiPropertyOptional({
    description:
      'List of automated benefit IDs granted to customer upon purchase',
    type: [String],
    example: ['ben_123', 'ben_456'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  benefits?: string[];

  @ApiPropertyOptional({
    description: 'Custom key-value metadata object',
    example: { tier: 'pro', features: 'all' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, string | number | boolean>;
}
