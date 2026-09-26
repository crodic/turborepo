import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum PolarDiscountType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
}

export enum PolarDiscountDuration {
  ONCE = 'once',
  FOREVER = 'forever',
  REPEATING = 'repeating',
}

@Entity('polar_discounts')
export class PolarDiscountEntity extends AbstractEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_polar_discount_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ name: 'polar_discount_id', type: 'varchar', length: 150 })
  @Index('UQ_polar_discounts_polar_discount_id', { unique: true })
  polarDiscountId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  type!: PolarDiscountType;

  @Column({ type: 'integer', nullable: true })
  amount?: number | null;

  @Column({ name: 'basis_points', type: 'integer', nullable: true })
  basisPoints?: number | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  amounts?: Record<string, number> | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index('IDX_polar_discounts_code')
  code?: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    default: PolarDiscountDuration.ONCE,
  })
  duration!: PolarDiscountDuration;

  @Column({ name: 'duration_in_months', type: 'integer', nullable: true })
  durationInMonths?: number | null;

  @Column({ name: 'max_redemptions', type: 'integer', nullable: true })
  maxRedemptions?: number | null;

  @Column({ name: 'redemptions_count', type: 'integer', default: 0 })
  redemptionsCount!: number;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt?: Date | null;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt?: Date | null;

  @Column({ name: 'product_ids', type: 'jsonb', default: () => "'[]'" })
  productIds!: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  constructor(data?: Partial<PolarDiscountEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
