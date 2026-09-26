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

  @Index('IDX_polar_subscriptions_user_id')
  @Column({ type: 'bigint', name: 'user_id', nullable: true })
  userId?: AutoIncrementID | null;

  @ManyToOne(() => UserEntity, (user) => user.subscriptions, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_polar_subscriptions_user_id',
  })
  user?: Relation<UserEntity> | null;

  @Index('IDX_polar_subscriptions_polar_subscription_id', { unique: true })
  @Column({ type: 'varchar', length: 150, name: 'polar_subscription_id' })
  polarSubscriptionId!: string;

  @Index('IDX_polar_subscriptions_polar_customer_id')
  @Column({
    type: 'varchar',
    length: 150,
    name: 'polar_customer_id',
    nullable: true,
  })
  polarCustomerId?: string | null;

  @Column({ type: 'varchar', length: 150, name: 'product_id' })
  productId!: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'customer_email',
    nullable: true,
  })
  customerEmail?: string | null;

  @Column({ type: 'integer', nullable: true })
  amount?: number | null;

  @Column({ type: 'varchar', length: 10, default: 'usd' })
  currency!: string;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'recurring_interval',
    nullable: true,
  })
  recurringInterval?: string | null;

  @Index('IDX_polar_subscriptions_status')
  @Column({
    type: 'enum',
    enum: PolarSubscriptionStatus,
    default: PolarSubscriptionStatus.INCOMPLETE,
  })
  status!: PolarSubscriptionStatus;

  @Column({ type: 'timestamptz', name: 'current_period_start', nullable: true })
  currentPeriodStart?: Date | null;

  @Column({ type: 'timestamptz', name: 'current_period_end', nullable: true })
  currentPeriodEnd?: Date | null;

  @Column({ type: 'boolean', name: 'cancel_at_period_end', default: false })
  cancelAtPeriodEnd!: boolean;

  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  startedAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'ended_at', nullable: true })
  endedAt?: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;
}
