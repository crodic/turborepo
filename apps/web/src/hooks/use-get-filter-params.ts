import { type ColumnDef } from '@tanstack/react-table'
import {
  parseAsInteger,
  parseAsString,
  type SingleParser,
  useQueryState,
  useQueryStates,
} from 'nuqs'
import { getSortingStateParser } from '@/lib/parsers'

export type InferParser<T> = T extends SingleParser<infer R> ? R : never

export type InferParsers<T extends Record<string, SingleParser<any>>> = {
  [K in keyof T]?: InferParser<T[K]>
}

interface UseGetFilterParamsProps<
  TData,
  TParsers extends Record<string, SingleParser<any>>,
> {
  allowedSorts?: string[]
  filterParsers: TParsers
  filterableColumns?: ColumnDef<TData>[]
}

export default function useGetFilterParams<
  TData,
  TParsers extends Record<string, SingleParser<any>>,
>({
  allowedSorts = [],
  filterParsers,
}: UseGetFilterParamsProps<TData, TParsers>) {
  // pagination
  const [page] = useQueryState('page', parseAsInteger.withDefault(1))
  const [perPage] = useQueryState('perPage', parseAsInteger.withDefault(10))
  const [searchBy] = useQueryState('searchBy', parseAsString.withDefault(''))
  const [search] = useQueryState('search', parseAsString.withDefault(''))

  // sorting
  const [sorting] = useQueryState(
    'sort',
    getSortingStateParser<TData>(allowedSorts).withDefault([])
  )

  // filters (TYPE-SAFE)
  const [filterValues] = useQueryStates(filterParsers)

  return {
    page,
    perPage,
    sorting,
    filter: filterValues as InferParsers<TParsers>,
    searchBy,
    search,
  }
}
