import { SelectQueryBuilder } from 'typeorm';

export interface QueryFilter<T = any, V = any> {
  key: string;
  apply(qb: SelectQueryBuilder<T>, value: V): void;
}
