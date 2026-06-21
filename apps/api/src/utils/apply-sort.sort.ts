import { QuerySort } from '@/common/interfaces/sort.interface';
import { SelectQueryBuilder, SortDirection } from 'typeorm';

/**
 * Applies sorting to a query builder based on the given sort string and available sorts.
 * The sort string should be in the format of 'key:direction,key:direction' where key is the key of the available sort and direction is either 'asc' or 'desc'.
 * If the sort string is empty or undefined, the function will return the query builder as is.
 * If the sort string contains a key that is not in the available sorts, the function will ignore that key.
 * @param qb The query builder to which the sorting should be applied.
 * @param sort The sort string to apply to the query builder.
 * @param availableSorts The available sorts to apply to the query builder.
 * @returns The query builder with the sorting applied.
 *
 * */
export function applySort<T>(
  qb: SelectQueryBuilder<T>,
  sort: string | undefined,
  availableSorts: QuerySort<T>[],
): SelectQueryBuilder<T> {
  if (!sort) return qb;

  const sortMap = new Map(availableSorts.map((s) => [s.key, s]));

  sort.split(',').forEach((part) => {
    const [key, rawDirection] = part.split(':');

    if (!key) return;

    const direction: SortDirection = rawDirection === 'desc' ? 'desc' : 'asc';

    const sorter = sortMap.get(key);
    if (!sorter) return;

    sorter.apply(qb, direction);
  });

  return qb;
}

export function applySorts<T>(
  qb: SelectQueryBuilder<T>,
  sort: string | undefined,
  availableSorts: QuerySort<T>[],
  defaultSort?: { key: string; direction: 'asc' | 'desc' },
): SelectQueryBuilder<T> {
  const sortMap = new Map(availableSorts.map((s) => [s.key, s]));

  if (!sort || sort.trim() === '') {
    if (defaultSort) {
      const sorter = sortMap.get(defaultSort.key);
      if (sorter) {
        sorter.apply(qb, defaultSort.direction);
      }
    }
    return qb;
  }

  sort.split(',').forEach((part) => {
    const [key, rawDirection] = part.split(':');

    if (!key) return;

    const direction: SortDirection = rawDirection === 'desc' ? 'desc' : 'asc';

    const sorter = sortMap.get(key);
    if (!sorter) return;

    sorter.apply(qb, direction);
  });

  return qb;
}
