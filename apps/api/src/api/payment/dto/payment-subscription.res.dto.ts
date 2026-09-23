import { AutoIncrementID } from '@/common/types/common.type';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentSubscriptionStatus } from '../entities/payment-subscription.entity';

export class PaymentSubscriptionResDto {
  @ApiProperty({ example: 1 })
  id!: AutoIncrementID;

  @ApiPropertyOptional({ example: 'usr_123' })
  userId?: string | null;

  @ApiPropertyOptional({ example: 2 })
  customerId?: AutoIncrementID | null;

  @ApiProperty({ example: 'customer@example.com' })
  customerEmail!: string;

  @ApiProperty({ example: 'sub_123456789' })
  polarSubscriptionId!: string;

  @ApiPropertyOptional({ example: 'cus_123456789' })
  polarCustomerId?: string | null;

  @ApiProperty({ example: 'prod_123456789' })
  productId!: string;

  @ApiProperty({
    enum: PaymentSubscriptionStatus,
    example: PaymentSubscriptionStatus.ACTIVE,
  })
  status!: PaymentSubscriptionStatus;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  currentPeriodStart?: Date | null;

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z' })
  currentPeriodEnd?: Date | null;

  @ApiProperty({ example: false })
  cancelAtPeriodEnd!: boolean;

  @ApiPropertyOptional({ example: null })
  metadata?: Record<string, any> | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
