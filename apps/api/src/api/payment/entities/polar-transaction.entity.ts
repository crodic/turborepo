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

export enum PolarTransactionType {
  CHARGE = 'charge',
  REFUND = 'refund',
  DISPUTE = 'dispute',
}

export enum PolarTransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('polar_transactions')
export class PolarTransactionEntity extends AbstractEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_polar_transaction_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  @Index('IDX_polar_transactions_user_id')
  userId?: AutoIncrementID | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_polar_transactions_user_id',
  })
  user?: Relation<UserEntity> | null;

  @Column({ name: 'order_id', type: 'bigint', nullable: true })
  @Index('IDX_polar_transactions_order_id')
  orderId?: AutoIncrementID | null;

  @Column({ name: 'subscription_id', type: 'bigint', nullable: true })
  @Index('IDX_polar_transactions_subscription_id')
  subscriptionId?: AutoIncrementID | null;

  @Column({
    name: 'polar_payment_id',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  @Index('IDX_polar_transactions_polar_payment_id')
  polarPaymentId?: string | null;

  @Column({
    type: 'enum',
    enum: PolarTransactionType,
    enumName: 'polar_transactions_type_enum',
    default: PolarTransactionType.CHARGE,
  })
  type!: PolarTransactionType;

  @Column({
    type: 'enum',
    enum: PolarTransactionStatus,
    enumName: 'polar_transactions_status_enum',
    default: PolarTransactionStatus.PENDING,
  })
  @Index('IDX_polar_transactions_status')
  status!: PolarTransactionStatus;

  @Column({ type: 'integer' })
  amount!: number; // Smallest currency unit (cents)

  @Column({ name: 'fee_amount', type: 'integer', default: 0 })
  feeAmount!: number;

  @Column({ name: 'net_amount', type: 'integer', default: 0 })
  netAmount!: number;

  @Column({ type: 'varchar', length: 10, default: 'usd' })
  currency!: string;

  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  paymentMethod?: string | null;

  @Column({ name: 'card_brand', type: 'varchar', length: 50, nullable: true })
  cardBrand?: string | null;

  @Column({ name: 'card_last4', type: 'varchar', length: 4, nullable: true })
  cardLast4?: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  constructor(data?: Partial<PolarTransactionEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}

// Backward-compatible aliases
export {
  PolarTransactionEntity as PaymentTransactionEntity,
  PolarTransactionStatus as PaymentTransactionStatus,
  PolarTransactionType as PaymentTransactionType,
};
