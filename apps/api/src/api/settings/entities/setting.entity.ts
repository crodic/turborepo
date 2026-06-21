import { AutoIncrementID } from '@/common/types/common.type';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('settings')
export class SettingEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_setting_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column()
  @Index('UQ_setting_key', { unique: true })
  key: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  value: any;
}
