import { AutoIncrementID } from '@/common/types/common.type';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PaymentTransactionStatus,
  PaymentTransactionType,
} from '../entities/payment-transaction.entity';

export class PaymentTransactionResDto {
  @ApiProperty({ example: 1 })
  id!: AutoIncrementID;

  @ApiPropertyOptional({ example: 'usr_123' })
  userId?: string | null;

  @ApiPropertyOptional({ example: 10 })
  orderId?: AutoIncrementID | null;

  @ApiPropertyOptional({ example: 5 })
  subscriptionId?: AutoIncrementID | null;

  @ApiPropertyOptional({ example: 'pay_123456789' })
  polarPaymentId?: string | null;

  @ApiProperty({
    enum: PaymentTransactionType,
    example: PaymentTransactionType.CHARGE,
  })
  type!: PaymentTransactionType;

  @ApiProperty({
    enum: PaymentTransactionStatus,
    example: PaymentTransactionStatus.SUCCESS,
  })
  status!: PaymentTransactionStatus;

  @ApiProperty({ example: 2900, description: 'Amount in cents' })
  amount!: number;

  @ApiProperty({ example: 120, description: 'Fee amount in cents' })
  feeAmount!: number;

  @ApiProperty({ example: 2780, description: 'Net amount in cents' })
  netAmount!: number;

  @ApiProperty({ example: 'usd' })
  currency!: string;

  @ApiPropertyOptional({ example: 'card' })
  paymentMethod?: string | null;

  @ApiPropertyOptional({ example: 'visa' })
  cardBrand?: string | null;

  @ApiPropertyOptional({ example: '4242' })
  cardLast4?: string | null;

  @ApiPropertyOptional({ example: null })
  errorMessage?: string | null;

  @ApiPropertyOptional({ example: null })
  metadata?: Record<string, any> | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
