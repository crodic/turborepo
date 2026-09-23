import { AutoIncrementID } from '@/common/types/common.type';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentOrderStatus } from '../entities/payment-order.entity';

export class PaymentOrderResDto {
  @ApiProperty({ example: 1 })
  id!: AutoIncrementID;

  @ApiProperty({ example: 'ORD-20260923-A1B2C3D4' })
  orderNumber!: string;

  @ApiPropertyOptional({ example: 'usr_123' })
  userId?: string | null;

  @ApiProperty({ example: 'customer@example.com' })
  customerEmail!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  customerName?: string | null;

  @ApiPropertyOptional({ example: 'chk_123456789' })
  polarCheckoutId?: string | null;

  @ApiPropertyOptional({ example: 'ord_123456789' })
  polarOrderId?: string | null;

  @ApiProperty({ example: 'prod_123456789' })
  productId!: string;

  @ApiPropertyOptional({ example: 'Pro Membership' })
  productTitle?: string | null;

  @ApiProperty({
    example: 2900,
    description: 'Amount in cents (e.g. 2900 = $29.00)',
  })
  amount!: number;

  @ApiProperty({ example: 'usd' })
  currency!: string;

  @ApiProperty({ enum: PaymentOrderStatus, example: PaymentOrderStatus.PAID })
  status!: PaymentOrderStatus;

  @ApiPropertyOptional({ example: { plan: 'pro' } })
  metadata?: Record<string, any> | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
