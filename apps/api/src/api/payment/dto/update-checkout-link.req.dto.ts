import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class UpdateCheckoutLinkReqDto {
  @ApiPropertyOptional({
    description: 'Updated list of product IDs',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  products?: string[];

  @ApiPropertyOptional({
    description: 'Updated internal label',
    example: 'Updated Twitter Promo Link',
  })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({
    description: 'Updated default discount ID',
  })
  @IsString()
  @IsOptional()
  discountId?: string;

  @ApiPropertyOptional({
    description: 'Whether to allow customer to enter alternative coupon codes',
  })
  @IsBoolean()
  @IsOptional()
  allowDiscountCodes?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to require full billing address at checkout',
  })
  @IsBoolean()
  @IsOptional()
  requireBillingAddress?: boolean;

  @ApiPropertyOptional({
    description: 'Updated trial interval unit',
    enum: ['day', 'week', 'month', 'year'],
  })
  @IsIn(['day', 'week', 'month', 'year'])
  @IsOptional()
  trialInterval?: 'day' | 'week' | 'month' | 'year';

  @ApiPropertyOptional({
    description: 'Updated trial interval count',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  trialIntervalCount?: number;

  @ApiPropertyOptional({
    description: 'Updated preconfigured number of seats for seat-based pricing',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  seats?: number;

  @ApiPropertyOptional({
    description: 'Updated success redirect URL',
  })
  @IsUrl()
  @IsOptional()
  successUrl?: string;

  @ApiPropertyOptional({
    description: 'Updated return URL',
  })
  @IsUrl()
  @IsOptional()
  returnUrl?: string;

  @ApiPropertyOptional({
    description: 'Updated metadata object',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, string | number | boolean>;
}
