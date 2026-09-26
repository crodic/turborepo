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
import { AdminUserEntity } from '../../admin-user/entities/admin-user.entity';
import { UserEntity } from '../../user/entities/user.entity';
import { PolarOrderEntity } from './polar-order.entity';

export enum PolarRefundRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSED = 'processed',
}

export enum RefundReason {
  CUSTOMER_REQUEST = 'customer_request',
  SERVICE_DISRUPTION = 'service_disruption',
  SATISFACTION_GUARANTEE = 'satisfaction_guarantee',
  DUPLICATE = 'duplicate',
  FRAUDULENT = 'fraudulent',
  OTHER = 'other',
}

@Entity('polar_refund_requests')
export class PolarRefundRequestEntity extends AbstractEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_polar_refund_request_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ name: 'order_id', type: 'bigint' })
  @Index('IDX_polar_refund_requests_order_id')
  orderId!: AutoIncrementID;

  @ManyToOne(() => PolarOrderEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'order_id',
    foreignKeyConstraintName: 'FK_polar_refund_requests_order_id',
  })
  order!: Relation<PolarOrderEntity>;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  @Index('IDX_polar_refund_requests_user_id')
  userId?: AutoIncrementID | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_polar_refund_requests_user_id',
  })
  user?: Relation<UserEntity> | null;

  @Column({ type: 'integer' })
  amount!: number;

  @Column({ type: 'varchar', length: 10, default: 'usd' })
  currency!: string;

  @Column({ type: 'varchar', length: 100 })
  reason!: string;

  @Column({ name: 'customer_note', type: 'text', nullable: true })
  customerNote?: string | null;

  @Column({
    type: 'enum',
    enum: PolarRefundRequestStatus,
    enumName: 'polar_refund_requests_status_enum',
    default: PolarRefundRequestStatus.PENDING,
  })
  @Index('IDX_polar_refund_requests_status')
  status!: PolarRefundRequestStatus;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote?: string | null;

  @Column({ name: 'reviewed_by', type: 'bigint', nullable: true })
  reviewedBy?: AutoIncrementID | null;

  @ManyToOne(() => AdminUserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'reviewed_by',
    foreignKeyConstraintName: 'FK_polar_refund_requests_reviewed_by',
  })
  reviewer?: Relation<AdminUserEntity> | null;

  @Column({
    name: 'reviewed_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  reviewedAt?: Date | null;

  @Column({
    name: 'polar_refund_id',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  polarRefundId?: string | null;
}

// Backward-compatible aliases
export {
  PolarRefundRequestEntity as PaymentRefundRequestEntity,
  PolarRefundRequestStatus as PaymentRefundRequestStatus,
};
