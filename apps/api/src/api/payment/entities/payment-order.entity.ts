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

export enum PaymentOrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
}

@Entity('payment_orders')
export class PaymentOrderEntity extends AbstractEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_payment_order_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ name: 'order_number', type: 'varchar', length: 64 })
  @Index('UQ_payment_orders_order_number', { unique: true })
  orderNumber!: string;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  @Index('IDX_payment_orders_user_id')
  userId?: AutoIncrementID | null;

  @ManyToOne(() => UserEntity, (user) => user.orders, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_payment_orders_user_id',
  })
  user?: Relation<UserEntity> | null;

  @Column({ name: 'customer_id', type: 'bigint', nullable: true })
  @Index('IDX_payment_orders_customer_id')
  customerId?: AutoIncrementID | null;

  @Column({ name: 'customer_email', type: 'varchar', length: 255 })
  @Index('IDX_payment_orders_customer_email')
  customerEmail!: string;

  @Column({
    name: 'customer_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  customerName?: string | null;

  @Column({
    name: 'polar_checkout_id',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  @Index('IDX_payment_orders_polar_checkout_id')
  polarCheckoutId?: string | null;

  @Column({
    name: 'polar_order_id',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  @Index('IDX_payment_orders_polar_order_id')
  polarOrderId?: string | null;

  @Column({ name: 'product_id', type: 'varchar', length: 150 })
  productId!: string;

  @Column({
    name: 'product_title',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  productTitle?: string | null;

  @Column({ type: 'integer' })
  amount!: number; // Stored in smallest currency unit (e.g. cents)

  @Column({ type: 'varchar', length: 10, default: 'usd' })
  currency!: string;

  @Column({
    type: 'enum',
    enum: PaymentOrderStatus,
    default: PaymentOrderStatus.PENDING,
  })
  @Index('IDX_payment_orders_status')
  status!: PaymentOrderStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  constructor(data?: Partial<PaymentOrderEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
