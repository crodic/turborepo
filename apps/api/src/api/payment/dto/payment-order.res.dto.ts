import { AutoIncrementID } from '@/common/types/common.type';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentOrderStatus } from '../entities/polar-order.entity';

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

  @ApiPropertyOptional({ example: 2900 })
  subtotalAmount?: number | null;

  @ApiPropertyOptional({ example: 0 })
  taxAmount?: number | null;

  @ApiPropertyOptional({ example: 500 })
  discountAmount?: number | null;

  @ApiPropertyOptional({ example: 'dsc_123' })
  discountId?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  customFieldData?: Record<string, any> | null;

  @ApiPropertyOptional({ example: 'https://polar.sh/invoices/inv_123.pdf' })
  invoiceUrl?: string | null;

  @ApiPropertyOptional({ example: 'https://polar.sh/receipts/rec_123.pdf' })
  receiptUrl?: string | null;

  @ApiProperty({ enum: PaymentOrderStatus, example: PaymentOrderStatus.PAID })
  status!: PaymentOrderStatus;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, any> | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
