import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';

export enum PolarSubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  INCOMPLETE = 'incomplete',
  TRIALING = 'trialing',
  UNPAID = 'unpaid',
  PAUSED = 'paused',
}

@Entity('polar_subscriptions')
export class PolarSubscriptionEntity extends AbstractEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_polar_subscription_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  @Index('IDX_polar_subscriptions_user_id')
  userId?: AutoIncrementID | null;

  @ManyToOne(() => UserEntity, (user) => user.subscriptions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_polar_subscriptions_user_id',
  })
  user?: Relation<UserEntity> | null;

  @Column({ name: 'customer_id', type: 'bigint', nullable: true })
  @Index('IDX_polar_subscriptions_customer_id')
  customerId?: AutoIncrementID | null;

  @Column({ name: 'customer_email', type: 'varchar', length: 255 })
  @Index('IDX_polar_subscriptions_customer_email')
  customerEmail!: string;

  @Column({ name: 'polar_subscription_id', type: 'varchar', length: 150 })
  @Index('UQ_polar_subscriptions_polar_subscription_id', { unique: true })
  polarSubscriptionId!: string;

  @Column({
    name: 'polar_customer_id',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  @Index('IDX_polar_subscriptions_polar_customer_id')
  polarCustomerId?: string | null;

  @Column({ name: 'product_id', type: 'varchar', length: 150 })
  productId!: string;

  @Column({ type: 'integer', nullable: true })
  amount?: number | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency?: string | null;

  @Column({
    name: 'recurring_interval',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  recurringInterval?: string | null;

  @Column({
    type: 'enum',
    enum: PolarSubscriptionStatus,
    enumName: 'polar_subscriptions_status_enum',
    default: PolarSubscriptionStatus.INCOMPLETE,
  })
  @Index('IDX_polar_subscriptions_status')
  status!: PolarSubscriptionStatus;

  @Column({ name: 'current_period_start', type: 'timestamptz', nullable: true })
  currentPeriodStart?: Date | null;

  @Column({ name: 'current_period_end', type: 'timestamptz', nullable: true })
  currentPeriodEnd?: Date | null;

  @Column({ name: 'cancel_at_period_end', type: 'boolean', default: false })
  cancelAtPeriodEnd!: boolean;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt?: Date | null;

  @Column({ name: 'discount_id', type: 'varchar', length: 150, nullable: true })
  discountId?: string | null;

  @Column({ name: 'custom_field_data', type: 'jsonb', nullable: true })
  customFieldData?: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  constructor(data?: Partial<PolarSubscriptionEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}

// Backward-compatible aliases
export {
  PolarSubscriptionEntity as PaymentSubscriptionEntity,
  PolarSubscriptionStatus as PaymentSubscriptionStatus,
};
