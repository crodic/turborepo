import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum PaymentWebhookStatus {
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

  @Index('IDX_polar_webhook_events_event_id', { unique: true })
  @Column({ type: 'varchar', length: 150, name: 'event_id' })
  eventId!: string;

  @Index('IDX_polar_webhook_events_event_type')
  @Column({ type: 'varchar', length: 100, name: 'event_type' })
  eventType!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, any>;

  @Index('IDX_polar_webhook_events_status')
  @Column({
    type: 'enum',
    enum: PaymentWebhookStatus,
    default: PaymentWebhookStatus.PENDING,
  })
  status!: PaymentWebhookStatus;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage?: string | null;

  @Column({ type: 'timestamptz', name: 'processed_at', nullable: true })
  processedAt?: Date | null;
}
