import { SelectQueryBuilder } from 'typeorm';

export type SortDirection = 'asc' | 'desc';

export interface QuerySort<T = any> {
  key: string;
  apply(qb: SelectQueryBuilder<T>, direction: SortDirection): void;
}
