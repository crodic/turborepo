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
import { getEmailTableColumns } from '../emails/columns'
import { useDataEmailLogs } from '../emails/queries'
import { ColumnKey, type EmailLogSchema } from '../emails/schema'

const emailLogFilterParsers = {
  subject: parseAsString.withDefault(''),
  status: parseAsArrayOf(parseAsString, ',').withDefault([]),
  source: parseAsArrayOf(parseAsString, ',').withDefault([]),
} as const

export function PageEmailLogOverview() {
  const navigate = useNavigate()
  const {
    page,
    perPage,
    sorting: sort,
    filter,
  } = useGetFilterParams<EmailLogSchema, typeof emailLogFilterParsers>({
    allowedSorts: [
      ColumnKey.createdAt,
      ColumnKey.scheduledAt,
      ColumnKey.sentAt,
      ColumnKey.status,
    ],
    filterParsers: emailLogFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('subject', filter.subject)
    .in('status', filter.status || [])
    .in('source', filter.source || [])
    .sortBy(sortParser(sort).sortBy, sortParser(sort).sortDirection)

  const { data, isFetching } = useDataEmailLogs(builder.build())
  const columns = useMemo(() => getEmailTableColumns(), [])
  const totalPages = data?.meta.totalPages ?? 0

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: totalPages,
    initialState: {
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
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Email Logs</h2>
          <p className='text-muted-foreground'>
            Audit email delivery, schedules, and failures.
          </p>
        </div>
        <DataTable
          table={table}
          onClickRowAction={(email) => navigate(`/email-logs/${email.id}/show`)}
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
