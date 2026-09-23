import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('payment_customers')
export class PaymentCustomerEntity extends AbstractEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_payment_customer_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ name: 'user_id', type: 'varchar', length: 100, nullable: true })
  @Index('IDX_payment_customers_user_id')
  userId?: string | null;

  @Column({ name: 'polar_customer_id', type: 'varchar', length: 150 })
  @Index('UQ_payment_customers_polar_customer_id', { unique: true })
  polarCustomerId!: string;

  @Column({ type: 'varchar', length: 255 })
  @Index('IDX_payment_customers_email')
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  constructor(data?: Partial<PaymentCustomerEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
