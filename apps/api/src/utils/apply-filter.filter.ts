import { QueryFilter } from '@/common/interfaces/filter.interface';
import { SelectQueryBuilder } from 'typeorm';

export function applyFilters<TEntity>(
  qb: SelectQueryBuilder<TEntity>,
  filters: Record<string, any> = {},
  availableFilters: QueryFilter[],
) {
  const map = new Map(availableFilters.map((f) => [f.key, f]));

  Object.entries(filters).forEach(([key, value]) => {
    const filter = map.get(key);
    if (!filter) return;

    filter.apply(qb, value);
  });

  return qb;
}

/**
 * Example:
 *
 * async findAll(filter: InferFilter<typeof USER_FILTER_SCHEMA>) {
  const qb = this.repo.createQueryBuilder('user');

  applyFilters(qb, filter, USER_FILTERS);

  return qb.getManyAndCount();
}
 *
 */
