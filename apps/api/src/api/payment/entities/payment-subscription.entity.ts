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

export enum PaymentSubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  INCOMPLETE = 'incomplete',
  TRIALING = 'trialing',
  UNPAID = 'unpaid',
  PAUSED = 'paused',
}

@Entity('payment_subscriptions')
export class PaymentSubscriptionEntity extends AbstractEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_payment_subscription_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  @Index('IDX_payment_subscriptions_user_id')
  userId?: AutoIncrementID | null;

  @ManyToOne(() => UserEntity, (user) => user.subscriptions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_payment_subscriptions_user_id',
  })
  user?: Relation<UserEntity> | null;

  @Column({ name: 'customer_id', type: 'bigint', nullable: true })
  @Index('IDX_payment_subscriptions_customer_id')
  customerId?: AutoIncrementID | null;

  @Column({ name: 'customer_email', type: 'varchar', length: 255 })
  @Index('IDX_payment_subscriptions_customer_email')
  customerEmail!: string;

  @Column({ name: 'polar_subscription_id', type: 'varchar', length: 150 })
  @Index('UQ_payment_subscriptions_polar_subscription_id', { unique: true })
  polarSubscriptionId!: string;

  @Column({
    name: 'polar_customer_id',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  @Index('IDX_payment_subscriptions_polar_customer_id')
  polarCustomerId?: string | null;

  @Column({ name: 'product_id', type: 'varchar', length: 150 })
  productId!: string;

  @Column({
    type: 'enum',
    enum: PaymentSubscriptionStatus,
    default: PaymentSubscriptionStatus.INCOMPLETE,
  })
  @Index('IDX_payment_subscriptions_status')
  status!: PaymentSubscriptionStatus;

  @Column({ name: 'current_period_start', type: 'timestamptz', nullable: true })
  currentPeriodStart?: Date | null;

  @Column({ name: 'current_period_end', type: 'timestamptz', nullable: true })
  currentPeriodEnd?: Date | null;

  @Column({ name: 'cancel_at_period_end', type: 'boolean', default: false })
  cancelAtPeriodEnd!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  constructor(data?: Partial<PaymentSubscriptionEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
