import { AutoIncrementID } from '@/common/types/common.type';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PolarSubscriptionStatus } from '../entities/polar-subscription.entity';

export class PaymentSubscriptionResDto {
  @ApiProperty({ example: '1' })
  id!: AutoIncrementID;

  @ApiPropertyOptional({ example: '1' })
  userId?: AutoIncrementID | null;

  @ApiProperty({ example: 'sub_123' })
  polarSubscriptionId!: string;

  @ApiPropertyOptional({ example: 'cus_123' })
  polarCustomerId?: string | null;

  @ApiProperty({ example: 'prod_123' })
  productId!: string;

  @ApiPropertyOptional({ example: 'customer@example.com' })
  customerEmail?: string | null;

  @ApiPropertyOptional({ example: 2900 })
  amount?: number | null;

  @ApiProperty({ example: 'usd' })
  currency!: string;

  @ApiPropertyOptional({ example: 'month' })
  recurringInterval?: string | null;

  @ApiProperty({
    enum: PolarSubscriptionStatus,
    example: PolarSubscriptionStatus.ACTIVE,
  })
  status!: PolarSubscriptionStatus;

  @ApiPropertyOptional()
  currentPeriodStart?: Date | null;

  @ApiPropertyOptional()
  currentPeriodEnd?: Date | null;

  @ApiProperty({ example: false })
  cancelAtPeriodEnd!: boolean;

  @ApiPropertyOptional()
  startedAt?: Date | null;

  @ApiPropertyOptional()
  endedAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;
}
