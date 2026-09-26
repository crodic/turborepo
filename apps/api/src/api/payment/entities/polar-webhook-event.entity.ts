import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum PolarWebhookStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

@Entity('polar_webhook_events')
export class PolarWebhookEventEntity extends AbstractEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_polar_webhook_event_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ name: 'event_id', type: 'varchar', length: 150 })
  @Index('UQ_polar_webhook_events_event_id', { unique: true })
  eventId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  @Index('IDX_polar_webhook_events_event_type')
  eventType!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, any>;

  @Column({
    type: 'enum',
    enum: PolarWebhookStatus,
    enumName: 'polar_webhook_events_status_enum',
    default: PolarWebhookStatus.PENDING,
  })
  @Index('IDX_polar_webhook_events_status')
  status!: PolarWebhookStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt?: Date | null;

  constructor(data?: Partial<PolarWebhookEventEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}

// Backward-compatible aliases
export {
  PolarWebhookEventEntity as PaymentWebhookEventEntity,
  PolarWebhookStatus as PaymentWebhookStatus,
};
