import { ApiProperty } from '@nestjs/swagger';
import { PaymentOrderResDto } from './payment-order.res.dto';
import { PaymentSubscriptionResDto } from './payment-subscription.res.dto';

export class UserPaymentSummaryResDto {
  @ApiProperty({
    type: [PaymentSubscriptionResDto],
    description: 'Active or historical subscriptions for this user',
  })
  subscriptions!: PaymentSubscriptionResDto[];

  @ApiProperty({
    type: [PaymentOrderResDto],
    description: 'Recent payment orders placed by this user',
  })
  recentOrders!: PaymentOrderResDto[];

  @ApiProperty({
    example: 3800,
    description:
      'Total lifetime amount spent in smallest currency unit (cents)',
  })
  totalSpent!: number;

  @ApiProperty({
    example: 2,
    description: 'Total count of orders completed by this user',
  })
  totalOrdersCount!: number;

  @ApiProperty({
    example: 'usd',
    description: 'Primary currency code',
  })
  currency!: string;
}
