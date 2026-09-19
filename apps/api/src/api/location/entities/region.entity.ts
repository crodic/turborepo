import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { CountryEntity } from './country.entity';

@Entity('regions')
export class RegionEntity extends AbstractEntity {
  constructor(data?: Partial<RegionEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_regions_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @OneToMany(() => CountryEntity, (country) => country.region)
  countries: Relation<CountryEntity[]>;
}
