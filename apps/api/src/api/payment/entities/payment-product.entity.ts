import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('payment_products')
@Unique('UQ_payment_products_slug_interval', ['planSlug', 'interval'])
export class PaymentProductEntity extends AbstractEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_payment_product_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ name: 'plan_slug', type: 'varchar', length: 50 })
  @Index('IDX_payment_products_plan_slug')
  planSlug!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 20 })
  @Index('IDX_payment_products_interval')
  interval!: string;

  @Column({ type: 'integer', default: 0 })
  price!: number;

  @Column({ type: 'varchar', length: 10, default: 'usd' })
  currency!: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  prices!: Array<{
    id?: string;
    amount: number;
    currency: string;
    isArchived?: boolean;
  }>;

  @Column({
    name: 'polar_product_id',
    type: 'varchar',
    length: 150,
    default: '',
  })
  polarProductId!: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  features!: string[];

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, any>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  benefits!: Array<Record<string, any>>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  medias!: Array<Record<string, any>>;

  @Column({
    name: 'trial_interval',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  trialInterval?: string | null;

  @Column({
    name: 'trial_interval_count',
    type: 'integer',
    nullable: true,
  })
  trialIntervalCount?: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  badge?: string | null;

  @Column({
    name: 'cta_text',
    type: 'varchar',
    length: 100,
    default: 'Get Started',
  })
  ctaText!: string;

  @Column({ name: 'is_popular', type: 'boolean', default: false })
  isPopular!: boolean;

  @Column({ name: 'is_free', type: 'boolean', default: false })
  isFree!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index('IDX_payment_products_is_active')
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  constructor(data?: Partial<PaymentProductEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
