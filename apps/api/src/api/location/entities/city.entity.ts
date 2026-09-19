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
import { CountryEntity } from './country.entity';
import { StateEntity } from './state.entity';

@Entity('cities')
@Index('IDX_cities_country_state', ['countryId', 'stateId'])
export class CityEntity extends AbstractEntity {
  constructor(data?: Partial<CityEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_cities_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Index('IDX_cities_name')
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index('IDX_cities_state_id')
  @Column({ name: 'state_id', type: 'bigint', nullable: true })
  stateId: AutoIncrementID | null;

  @Column({ name: 'state_code', type: 'varchar', length: 10, nullable: true })
  stateCode: string | null;

  @Index('IDX_cities_country_id')
  @Column({ name: 'country_id', type: 'bigint', nullable: true })
  countryId: AutoIncrementID | null;

  @Column({ name: 'country_code', type: 'varchar', length: 2, nullable: true })
  countryCode: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  code: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @ManyToOne(() => StateEntity, (state) => state.cities, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'state_id',
    foreignKeyConstraintName: 'FK_cities_state_id',
  })
  state: Relation<StateEntity> | null;

  @ManyToOne(() => CountryEntity, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'country_id',
    foreignKeyConstraintName: 'FK_cities_country_id',
  })
  country: Relation<CountryEntity> | null;
}
