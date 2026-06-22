import { useMemo } from 'react'
import { parseAsArrayOf, parseAsString } from 'nuqs'
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
import { getImpersonationHistoriesTableColumns } from './columns'
import { useDataImpersonationLogOverview } from './queries'
import { HistoryColumnKey, type ImpersonationLogHistorySchema } from './schema'

const impersonationLogsFilterParsers = {
  sessionId: parseAsString.withDefault(''),
  adminId: parseAsString.withDefault(''),
  targetUserId: parseAsString.withDefault(''),
  reason: parseAsString.withDefault(''),
  status: parseAsArrayOf(parseAsString, ',').withDefault([]),
} as const

export function PageImpersonationLogOverview() {
  const navigate = useNavigate()
  const {
    page,
    perPage,
    sorting: sort,
    filter,
  } = useGetFilterParams<
    ImpersonationLogHistorySchema,
    typeof impersonationLogsFilterParsers
  >({
    allowedSorts: [HistoryColumnKey.startedAt, HistoryColumnKey.stoppedAt],
    filterParsers: impersonationLogsFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .eq('sessionId', filter.sessionId)
    .eq('adminId', filter.adminId)
    .eq('targetUserId', filter.targetUserId)
    .ilike('reason', filter.reason)
    .in('status', filter.status || [])
    .sortBy(sortParser(sort).sortBy, sortParser(sort).sortDirection)

  const { data, isFetching } = useDataImpersonationLogOverview(builder.build())
  const columns = useMemo(() => getImpersonationHistoriesTableColumns(), [])
  const totalPages = data?.meta.totalPages ?? 0

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: totalPages,
    initialState: {
      columnPinning: { right: [] },
      sorting: [{ id: HistoryColumnKey.startedAt, desc: true }],
    },
    getRowId: (row) => row.id,
  })

  const handleRowClick = (history: ImpersonationLogHistorySchema) => {
    navigate(`/impersonation-logs/${history.id}/show`)
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
              Impersonation Histories
            </h2>
            <p className='text-muted-foreground'>
              Review each impersonation session and drill into actions.
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
