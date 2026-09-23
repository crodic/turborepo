import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum PaymentWebhookStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

@Entity('payment_webhook_events')
export class PaymentWebhookEventEntity extends AbstractEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_payment_webhook_event_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ name: 'event_id', type: 'varchar', length: 150 })
  @Index('UQ_payment_webhook_events_event_id', { unique: true })
  eventId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  @Index('IDX_payment_webhook_events_event_type')
  eventType!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, any>;

  @Column({
    type: 'enum',
    enum: PaymentWebhookStatus,
    default: PaymentWebhookStatus.PENDING,
  })
  @Index('IDX_payment_webhook_events_status')
  status!: PaymentWebhookStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt?: Date | null;

  constructor(data?: Partial<PaymentWebhookEventEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
