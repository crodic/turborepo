import { AutoIncrementID } from '@/common/types/common.type';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PolarRefundRequestStatus } from '../entities/polar-refund-request.entity';

export class PaymentRefundRequestResDto {
  @ApiProperty({ example: 1 })
  id!: AutoIncrementID;

  @ApiProperty({ example: 10 })
  orderId!: AutoIncrementID;

  @ApiPropertyOptional({ example: 'ORD-1718290000000-ABCDEF' })
  orderNumber?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  customerEmail?: string;

  @ApiPropertyOptional({ example: 5 })
  userId?: AutoIncrementID | null;

  @ApiProperty({ example: 1900 })
  amount!: number;

  @ApiProperty({ example: 'usd' })
  currency!: string;

  @ApiProperty({ example: 'satisfaction_guarantee' })
  reason!: string;

  @ApiPropertyOptional({ example: 'Service did not meet expectations' })
  customerNote?: string | null;

  @ApiProperty({
    enum: PolarRefundRequestStatus,
    example: PolarRefundRequestStatus.PENDING,
  })
  status!: PolarRefundRequestStatus;

  @ApiPropertyOptional({ example: 'Approved by admin' })
  adminNote?: string | null;

  @ApiPropertyOptional({ example: 1 })
  reviewedBy?: AutoIncrementID | null;

  @ApiPropertyOptional({ example: '2026-09-25T10:00:00.000Z' })
  reviewedAt?: Date | null;

  @ApiPropertyOptional({ example: 'ref_123456789' })
  polarRefundId?: string | null;

  @ApiProperty({ example: '2026-09-25T08:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-25T08:00:00.000Z' })
  updatedAt!: Date;
}
