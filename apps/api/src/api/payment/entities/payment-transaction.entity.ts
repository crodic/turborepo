import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum PaymentTransactionType {
  CHARGE = 'charge',
  REFUND = 'refund',
  DISPUTE = 'dispute',
}

export enum PaymentTransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('payment_transactions')
export class PaymentTransactionEntity extends AbstractEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_payment_transaction_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ name: 'user_id', type: 'varchar', length: 100, nullable: true })
  @Index('IDX_payment_transactions_user_id')
  userId?: string | null;

  @Column({ name: 'order_id', type: 'bigint', nullable: true })
  @Index('IDX_payment_transactions_order_id')
  orderId?: AutoIncrementID | null;

  @Column({ name: 'subscription_id', type: 'bigint', nullable: true })
  @Index('IDX_payment_transactions_subscription_id')
  subscriptionId?: AutoIncrementID | null;

  @Column({
    name: 'polar_payment_id',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  @Index('IDX_payment_transactions_polar_payment_id')
  polarPaymentId?: string | null;

  @Column({
    type: 'enum',
    enum: PaymentTransactionType,
    default: PaymentTransactionType.CHARGE,
  })
  type!: PaymentTransactionType;

  @Column({
    type: 'enum',
    enum: PaymentTransactionStatus,
    default: PaymentTransactionStatus.PENDING,
  })
  @Index('IDX_payment_transactions_status')
  status!: PaymentTransactionStatus;

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

  constructor(data?: Partial<PaymentTransactionEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
