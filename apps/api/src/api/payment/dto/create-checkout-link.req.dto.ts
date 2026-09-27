import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateCheckoutLinkReqDto {
  @ApiProperty({
    description: 'List of product IDs to include in the checkout link',
    example: ['prod_123'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  products: string[];

  @ApiPropertyOptional({
    description: 'Internal label to distinguish checkout links',
    example: 'Special Twitter Launch Link',
  })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({
    description:
      'ID of a discount/coupon to automatically apply to checkouts created with this link',
    example: 'disc_456',
  })
  @IsString()
  @IsOptional()
  discountId?: string;

  @ApiPropertyOptional({
    description: 'Whether to allow customer to enter alternative coupon codes',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  allowDiscountCodes?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether to require full billing address at checkout',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  requireBillingAddress?: boolean = false;

  @ApiPropertyOptional({
    description: 'Trial period interval unit for checkout',
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
    description: 'Preconfigured number of seats for seat-based pricing',
    example: 5,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  seats?: number;

  @ApiPropertyOptional({
    description: 'URL to redirect customer to after successful payment',
    example: 'https://example.com/checkout/success',
  })
  @IsUrl()
  @IsOptional()
  successUrl?: string;

  @ApiPropertyOptional({
    description: 'URL for back button if customer cancels checkout',
    example: 'https://example.com/pricing',
  })
  @IsUrl()
  @IsOptional()
  returnUrl?: string;

  @ApiPropertyOptional({
    description: 'Custom metadata object',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, string | number | boolean>;
}
