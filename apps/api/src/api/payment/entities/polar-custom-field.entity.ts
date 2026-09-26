import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum PolarCustomFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  CHECKBOX = 'checkbox',
  SELECT = 'select',
}

@Entity('polar_custom_fields')
export class PolarCustomFieldEntity extends AbstractEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_polar_custom_field_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ name: 'polar_custom_field_id', type: 'varchar', length: 150 })
  @Index('UQ_polar_custom_fields_polar_custom_field_id', { unique: true })
  polarCustomFieldId!: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  type!: PolarCustomFieldType;

  @Column({ type: 'varchar', length: 100 })
  @Index('IDX_polar_custom_fields_slug')
  slug!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  properties!: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  constructor(data?: Partial<PolarCustomFieldEntity>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
