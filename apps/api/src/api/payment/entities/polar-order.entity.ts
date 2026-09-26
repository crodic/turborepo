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

export enum PolarOrderStatus {
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

  @Column({ name: 'order_number', type: 'varchar', length: 64 })
  @Index('UQ_polar_orders_order_number', { unique: true })
  orderNumber!: string;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  @Index('IDX_polar_orders_user_id')
  userId?: AutoIncrementID | null;

  @ManyToOne(() => UserEntity, (user) => user.orders, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_polar_orders_user_id',
  })
  user?: Relation<UserEntity> | null;

  @Column({ name: 'customer_id', type: 'bigint', nullable: true })
  @Index('IDX_polar_orders_customer_id')
  customerId?: AutoIncrementID | null;

  @Column({ name: 'customer_email', type: 'varchar', length: 255 })
  @Index('IDX_polar_orders_customer_email')
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
  @Index('IDX_polar_orders_polar_checkout_id')
  polarCheckoutId?: string | null;

  @Column({
    name: 'polar_order_id',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  @Index('IDX_polar_orders_polar_order_id')
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

  @Column({ name: 'subtotal_amount', type: 'integer', nullable: true })
  subtotalAmount?: number | null;

  @Column({ name: 'tax_amount', type: 'integer', nullable: true })
  taxAmount?: number | null;

  @Column({ name: 'discount_amount', type: 'integer', nullable: true })
  discountAmount?: number | null;

  @Column({ name: 'discount_id', type: 'varchar', length: 150, nullable: true })
  discountId?: string | null;

  @Column({ name: 'custom_field_data', type: 'jsonb', nullable: true })
  customFieldData?: Record<string, any> | null;

  @Column({ name: 'invoice_url', type: 'varchar', length: 500, nullable: true })
  invoiceUrl?: string | null;

  @Column({ name: 'receipt_url', type: 'varchar', length: 500, nullable: true })
  receiptUrl?: string | null;

  @Column({
    type: 'enum',
    enum: PolarOrderStatus,
    enumName: 'polar_orders_status_enum',
    default: PolarOrderStatus.PENDING,
  })
  @Index('IDX_polar_orders_status')
  status!: PolarOrderStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  constructor(data?: Partial<PolarOrderEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}

// Backward-compatible aliases
export {
  PolarOrderEntity as PaymentOrderEntity,
  PolarOrderStatus as PaymentOrderStatus,
};
