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

@Entity('polar_orders')
export class PolarOrderEntity extends AbstractEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_polar_order_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Index('IDX_polar_orders_order_number', { unique: true })
  @Column({ type: 'varchar', length: 64, name: 'order_number' })
  orderNumber!: string;

  @Index('IDX_polar_orders_user_id')
  @Column({ type: 'bigint', name: 'user_id', nullable: true })
  userId?: AutoIncrementID | null;

  @ManyToOne(() => UserEntity, (user) => user.orders, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_polar_orders_user_id',
  })
  user?: Relation<UserEntity> | null;

  @Index('IDX_polar_orders_polar_order_id')
  @Column({
    type: 'varchar',
    length: 150,
    name: 'polar_order_id',
    nullable: true,
  })
  polarOrderId?: string | null;

  @Column({
    type: 'varchar',
    length: 150,
    name: 'polar_checkout_id',
    nullable: true,
  })
  polarCheckoutId?: string | null;

  @Index('IDX_polar_orders_customer_email')
  @Column({ type: 'varchar', length: 255, name: 'customer_email' })
  customerEmail!: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'customer_name',
    nullable: true,
  })
  customerName?: string | null;

  @Column({ type: 'varchar', length: 150, name: 'product_id' })
  productId!: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'product_title',
    nullable: true,
  })
  productTitle?: string | null;

  @Column({ type: 'integer' })
  amount!: number;

  @Column({ type: 'varchar', length: 10, default: 'usd' })
  currency!: string;

  @Column({
    type: 'enum',
    enum: PaymentOrderStatus,
    default: PaymentOrderStatus.PENDING,
  })
  status!: PaymentOrderStatus;

  @Column({ type: 'varchar', length: 500, name: 'invoice_url', nullable: true })
  invoiceUrl?: string | null;

  @Column({ type: 'varchar', length: 500, name: 'receipt_url', nullable: true })
  receiptUrl?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;
}
