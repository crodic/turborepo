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
import { CityEntity } from './city.entity';
import { CountryEntity } from './country.entity';

@Entity('states')
@Index('IDX_states_country_iso2', ['countryId', 'iso2'])
export class StateEntity extends AbstractEntity {
  constructor(data?: Partial<StateEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_states_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'country_id', type: 'bigint' })
  countryId: AutoIncrementID;

  @Index('IDX_states_country_code')
  @Column({ name: 'country_code', type: 'varchar', length: 2, nullable: true })
  countryCode: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  iso2: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  iso3166_2: string | null;

  @Column({ type: 'varchar', length: 191, nullable: true })
  type: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  timezone: string | null;

  @ManyToOne(() => CountryEntity, (country) => country.states, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'country_id',
    foreignKeyConstraintName: 'FK_states_country_id',
  })
  country: Relation<CountryEntity>;

  @OneToMany(() => CityEntity, (city) => city.state)
  cities: Relation<CityEntity[]>;
}
