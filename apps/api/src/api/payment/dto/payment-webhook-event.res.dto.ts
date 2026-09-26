import { AutoIncrementID } from '@/common/types/common.type';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentWebhookStatus } from '../entities/polar-webhook-event.entity';

export class PaymentWebhookEventResDto {
  @ApiProperty({ example: '1' })
  id!: AutoIncrementID;

  @ApiProperty({ example: 'evt_123456789' })
  eventId!: string;

  @ApiProperty({ example: 'order.created' })
  eventType!: string;

  @ApiProperty({
    example: { id: 'ord_123', amount: 2900, status: 'paid' },
    description: 'Full JSON payload received from Polar webhook',
  })
  payload!: Record<string, any>;

  @ApiProperty({
    enum: PaymentWebhookStatus,
    example: PaymentWebhookStatus.PROCESSED,
  })
  status!: PaymentWebhookStatus;

  @ApiPropertyOptional({
    example: null,
    description: 'Error message if event processing failed',
  })
  errorMessage?: string | null;

  @ApiPropertyOptional({
    example: '2026-09-26T12:00:00.000Z',
    description: 'Timestamp when event was processed',
  })
  processedAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
