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

@Entity('polar_customers')
export class PolarCustomerEntity extends AbstractEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_polar_customer_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  @Index('IDX_polar_customers_user_id')
  userId?: AutoIncrementID | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_polar_customers_user_id',
  })
  user?: Relation<UserEntity> | null;

  @Column({ name: 'polar_customer_id', type: 'varchar', length: 150 })
  @Index('UQ_polar_customers_polar_customer_id', { unique: true })
  polarCustomerId!: string;

  @Column({ type: 'varchar', length: 255 })
  @Index('IDX_polar_customers_email')
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl?: string | null;

  @Column({ name: 'billing_address', type: 'jsonb', nullable: true })
  billingAddress?: Record<string, any> | null;

  @Column({ name: 'tax_id', type: 'varchar', length: 100, nullable: true })
  taxId?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  constructor(data?: Partial<PolarCustomerEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}

// Backward-compatible alias
export { PolarCustomerEntity as PaymentCustomerEntity };
