import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { RegionEntity } from './region.entity';
import { StateEntity } from './state.entity';

@Entity('countries')
export class CountryEntity extends AbstractEntity {
  constructor(data?: Partial<CountryEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_countries_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index('IDX_countries_iso2')
  @Column({ type: 'varchar', length: 2, nullable: true })
  iso2: string | null;

  @Index('IDX_countries_iso3')
  @Column({ type: 'varchar', length: 3, nullable: true })
  iso3: string | null;

  @Column({ name: 'numeric_code', type: 'varchar', length: 3, nullable: true })
  numericCode: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phonecode: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  capital: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency: string | null;

  @Column({
    name: 'currency_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  currencyName: string | null;

  @Column({
    name: 'currency_symbol',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  currencySymbol: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  tld: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  native: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subregion: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @Column({ name: 'region_id', type: 'bigint', nullable: true })
  regionId: AutoIncrementID | null;

  @ManyToOne(() => RegionEntity, (region) => region.countries, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'region_id',
    foreignKeyConstraintName: 'FK_countries_region_id',
  })
  region: Relation<RegionEntity> | null;

  @OneToMany(() => StateEntity, (state) => state.country)
  states: Relation<StateEntity[]>;
}
