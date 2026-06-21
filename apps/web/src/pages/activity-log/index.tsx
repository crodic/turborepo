import { useMemo } from 'react'
import { parseAsArrayOf, parseAsString } from 'nuqs'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { PaginateQueryBuilder } from '@/lib/query-builder'
import { sortParser } from '@/lib/utils'
import { useDataTable } from '@/hooks/use-data-table'
import useGetFilterParams from '@/hooks/use-get-filter-params'
import { ConfigDrawer } from '@/components/config-drawer'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableSortList } from '@/components/data-table/data-table-sort-list'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { getActivitiesTableColumns } from './columns'
import { useDataLogOverview } from './queries'
import { type ActivityLogSchema, ColumnKey } from './schema'

const activitiesFilterParsers = {
  entityId: parseAsString.withDefault(''),
  entity: parseAsString.withDefault(''),
  action: parseAsArrayOf(parseAsString, ',').withDefault([]),
  userId: parseAsString.withDefault(''),
} as const

export function PageActivityLogOverview() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const {
    page,
    perPage,
    sorting: sort,
    filter,
  } = useGetFilterParams<ActivityLogSchema, typeof activitiesFilterParsers>({
    allowedSorts: [ColumnKey.entityId, ColumnKey.timestamp],
    filterParsers: activitiesFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('entityId', filter.entityId)
    .ilike('entity', filter.entity)
    .eq('userId', filter.userId)
    .in('action', filter.action || [])
    .sortBy(sortParser(sort).sortBy, sortParser(sort).sortDirection)

  const { data, isFetching } = useDataLogOverview(builder.build())

  const columns = useMemo(
    () =>
      getActivitiesTableColumns({ actions: ['UPDATE', 'INSERT', 'DELETE'] }),
    []
  )

  const totalPages = data?.meta.totalPages ?? 0

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns: columns,
    pageCount: totalPages,
    initialState: {
      columnPinning: { right: ['actions'] },
    },
    getRowId: (row) => row.id,
  })

  const handleRowClick = (log: ActivityLogSchema) => {
    navigate(`/logs/${log.id}/show`)
  }

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main fluid className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              {t('activityLogs.overview.title')}
            </h2>
            <p className='text-muted-foreground'>
              {t('activityLogs.overview.description')}
            </p>
          </div>
        </div>
        <DataTable
          table={table}
          onClickRowAction={handleRowClick}
          isFetching={isFetching}
        >
          <DataTableToolbar table={table}>
            <DataTableSortList table={table} />
          </DataTableToolbar>
        </DataTable>
      </Main>
    </>
  )
}
