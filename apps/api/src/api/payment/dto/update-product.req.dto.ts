import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProductPriceInputDto } from './create-product.req.dto';

export class UpdateProductReqDto {
  @ApiPropertyOptional({
    description: 'Updated product name',
    example: 'Pro Subscription (v2)',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated product description',
    example: 'Updated tier description.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated product visibility',
    enum: ['public', 'private', 'draft'],
  })
  @IsIn(['public', 'private', 'draft'])
  @IsOptional()
  visibility?: 'public' | 'private' | 'draft';

  @ApiPropertyOptional({
    description:
      'Whether the product is archived. Archived products cannot be purchased anymore.',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  @ApiPropertyOptional({
    description: 'Updated trial interval unit',
    enum: ['day', 'week', 'month', 'year'],
  })
  @IsIn(['day', 'week', 'month', 'year'])
  @IsOptional()
  trialInterval?: 'day' | 'week' | 'month' | 'year';

  @ApiPropertyOptional({
    description: 'Updated trial interval count',
    example: 14,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  trialIntervalCount?: number;

  @ApiPropertyOptional({
    description: 'List of product prices',
    type: [ProductPriceInputDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPriceInputDto)
  @IsOptional()
  prices?: ProductPriceInputDto[];

  @ApiPropertyOptional({
    description: 'Shorthand price amount in minor units (cents)',
    example: 3900,
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
  currency?: string;

  @ApiPropertyOptional({
    description: 'List of product media file IDs',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  medias?: string[];

  @ApiPropertyOptional({
    description: 'Updated list of automated benefit IDs attached to product',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  benefits?: string[];

  @ApiPropertyOptional({
    description: 'Custom metadata object',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, string | number | boolean>;
}
