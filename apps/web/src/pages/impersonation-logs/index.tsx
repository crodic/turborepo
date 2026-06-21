import { useMemo } from 'react'
import { parseAsArrayOf, parseAsString } from 'nuqs'
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
import { getImpersonationLogsTableColumns } from './columns'
import { useDataImpersonationLogOverview } from './queries'
import { ColumnKey, type ImpersonationLogSchema } from './schema'

const impersonationLogsFilterParsers = {
  sessionId: parseAsString.withDefault(''),
  adminId: parseAsString.withDefault(''),
  targetUserId: parseAsString.withDefault(''),
  action: parseAsString.withDefault(''),
  endpoint: parseAsString.withDefault(''),
  status: parseAsArrayOf(parseAsString, ',').withDefault([]),
} as const

export function PageImpersonationLogOverview() {
  const {
    page,
    perPage,
    sorting: sort,
    filter,
  } = useGetFilterParams<
    ImpersonationLogSchema,
    typeof impersonationLogsFilterParsers
  >({
    allowedSorts: [ColumnKey.createdAt],
    filterParsers: impersonationLogsFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .eq('sessionId', filter.sessionId)
    .eq('adminId', filter.adminId)
    .eq('targetUserId', filter.targetUserId)
    .ilike('action', filter.action)
    .ilike('endpoint', filter.endpoint)
    .in('status', filter.status || [])
    .sortBy(sortParser(sort).sortBy, sortParser(sort).sortDirection)

  const { data, isFetching } = useDataImpersonationLogOverview(builder.build())
  const columns = useMemo(() => getImpersonationLogsTableColumns(), [])
  const totalPages = data?.meta.totalPages ?? 0

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: totalPages,
    initialState: {
      columnPinning: { right: [] },
      sorting: [{ id: ColumnKey.createdAt, desc: true }],
    },
    getRowId: (row) => row.id,
  })

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
              Impersonation Logs
            </h2>
            <p className='text-muted-foreground'>
              Review admin impersonation activity and audited user actions.
            </p>
          </div>
        </div>
        <DataTable table={table} isFetching={isFetching}>
          <DataTableToolbar table={table}>
            <DataTableSortList table={table} />
          </DataTableToolbar>
        </DataTable>
      </Main>
    </>
  )
}
