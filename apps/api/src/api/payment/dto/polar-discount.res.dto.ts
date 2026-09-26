import { AutoIncrementID } from '@/common/types/common.type';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class PolarDiscountResDto {
  @ApiProperty({ example: 1 })
  @Transform(({ value }: { value: any }) =>
    value != null ? Number(value) : value,
  )
  id!: AutoIncrementID;

  @ApiProperty({ example: 'dsc_123456789' })
  polarDiscountId!: string;

  @ApiProperty({ example: 'Summer 20% Off' })
  name!: string;

  @ApiProperty({ example: 'percentage', enum: ['fixed', 'percentage'] })
  type!: string;

  @ApiPropertyOptional({ example: 1000 })
  amount?: number | null;

  @ApiPropertyOptional({ example: 2000 })
  basisPoints?: number | null;

  @ApiPropertyOptional({ example: 'usd' })
  currency?: string | null;

  @ApiPropertyOptional({ example: { usd: 1000 } })
  amounts?: Record<string, number> | null;

  @ApiPropertyOptional({ example: 'SUMMER20' })
  code?: string | null;

  @ApiProperty({ example: 'once', enum: ['once', 'forever', 'repeating'] })
  duration!: string;

  @ApiPropertyOptional({ example: 3 })
  durationInMonths?: number | null;

  @ApiPropertyOptional({ example: 100 })
  maxRedemptions?: number | null;

  @ApiProperty({ example: 5 })
  redemptionsCount!: number;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  startsAt?: Date | null;

  @ApiPropertyOptional({ example: '2026-08-31T23:59:59.000Z' })
  endsAt?: Date | null;

  @ApiProperty({ example: ['prod_123'], type: [String] })
  productIds!: string[];

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, any> | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}
