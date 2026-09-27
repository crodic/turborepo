import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateDiscountReqDto {
  @ApiPropertyOptional({
    description: 'Updated name of the discount',
    example: 'Updated Launch Promo',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated promo code',
    example: 'SUMMER25',
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    description: 'Updated discount type',
    enum: ['percentage', 'fixed'],
  })
  @IsIn(['percentage', 'fixed'])
  @IsOptional()
  type?: 'percentage' | 'fixed';

  @ApiPropertyOptional({
    description: 'Updated percentage in basis points (e.g. 2500 = 25%)',
    example: 2500,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  basisPoints?: number;

  @ApiPropertyOptional({
    description: 'Updated fixed amount in cents',
    example: 1500,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Updated currency',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Updated multi-currency amounts object',
  })
  @IsObject()
  @IsOptional()
  amounts?: Record<string, number>;

  @ApiPropertyOptional({
    description: 'Updated duration of the discount',
    enum: ['once', 'forever', 'repeating'],
    example: 'repeating',
  })
  @IsIn(['once', 'forever', 'repeating'])
  @IsOptional()
  duration?: 'once' | 'forever' | 'repeating';

  @ApiPropertyOptional({
    description: 'Updated duration in months if repeating',
    example: 6,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationInMonths?: number;

  @ApiPropertyOptional({
    description: 'Updated timestamp when coupon becomes redeemable',
  })
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional({
    description: 'Updated timestamp when coupon expires',
  })
  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @ApiPropertyOptional({
    description: 'Updated maximum number of redemptions',
    example: 200,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxRedemptions?: number;

  @ApiPropertyOptional({
    description: 'Updated list of eligible product IDs',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  products?: string[];

  @ApiPropertyOptional({
    description: 'Updated custom metadata',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, string | number | boolean>;
}
