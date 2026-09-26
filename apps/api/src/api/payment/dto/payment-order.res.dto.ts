import { AutoIncrementID } from '@/common/types/common.type';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentOrderStatus } from '../entities/polar-order.entity';

export class PaymentOrderResDto {
  @ApiProperty({ example: '1' })
  id!: AutoIncrementID;

  @ApiProperty({ example: 'ORD-LXYZ-ABC123' })
  orderNumber!: string;

  @ApiPropertyOptional({ example: '1' })
  userId?: AutoIncrementID | null;

  @ApiPropertyOptional({ example: 'order_123' })
  polarOrderId?: string | null;

  @ApiProperty({ example: 'customer@example.com' })
  customerEmail!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  customerName?: string | null;

  @ApiProperty({ example: 'prod_123' })
  productId!: string;

  @ApiPropertyOptional({ example: 'Pro Plan' })
  productTitle?: string | null;

  @ApiProperty({ example: 2900 })
  amount!: number;

  @ApiProperty({ example: 'usd' })
  currency!: string;

  @ApiProperty({ enum: PaymentOrderStatus, example: PaymentOrderStatus.PAID })
  status!: PaymentOrderStatus;

  @ApiPropertyOptional({ example: 'https://polar.sh/orders/xxx/invoice' })
  invoiceUrl?: string | null;

  @ApiPropertyOptional({ example: 'https://polar.sh/orders/xxx/receipt' })
  receiptUrl?: string | null;

  @ApiProperty()
  createdAt!: Date;
}
