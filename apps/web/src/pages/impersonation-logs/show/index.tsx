import { useMemo } from 'react'
import { format } from 'date-fns'
import { ArrowLeftIcon } from 'lucide-react'
import { parseAsArrayOf, parseAsString } from 'nuqs'
import { useNavigate, useParams } from 'react-router'
import { PaginateQueryBuilder } from '@/lib/query-builder'
import { sortParser } from '@/lib/utils'
import { useDataTable } from '@/hooks/use-data-table'
import useGetFilterParams from '@/hooks/use-get-filter-params'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DescriptionItem, Descriptions } from '@/components/common/descriptions'
import { ConfigDrawer } from '@/components/config-drawer'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableSortList } from '@/components/data-table/data-table-sort-list'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import DataLoader from '@/components/layout/data-loader'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { NotFoundError } from '@/pages/errors/not-found-error'
import { getImpersonationItemsTableColumns } from '../columns'
import {
  useDataImpersonationLogDetail,
  useDataImpersonationLogItems,
} from '../queries'
import { ItemColumnKey, type ImpersonationLogItemSchema } from '../schema'

const itemFilterParsers = {
  action: parseAsString.withDefault(''),
  endpoint: parseAsString.withDefault(''),
  status: parseAsArrayOf(parseAsString, ',').withDefault([]),
} as const

function formatLogUser(user: any, fallbackId?: string | null) {
  if (!user) return fallbackId ? `#${fallbackId}` : '-'

  const name =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    undefined

  const secondary = name && user.email ? user.email : undefined

  return [name || user.email || `#${user.id}`, secondary, `#${user.id}`]
    .filter(Boolean)
    .join(' | ')
}

function formatDate(value?: string | null) {
  return value ? format(value, 'yyyy-MM-dd HH:mm aa') : '-'
}

export default function PageImpersonationLogShow() {
  const params = useParams()
  const navigate = useNavigate()
  const id = params.id as string

  const {
    page,
    perPage,
    sorting: sort,
    filter,
  } = useGetFilterParams<ImpersonationLogItemSchema, typeof itemFilterParsers>({
    allowedSorts: [ItemColumnKey.createdAt],
    filterParsers: itemFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('action', filter.action)
    .ilike('endpoint', filter.endpoint)
    .in('status', filter.status || [])
    .sortBy(sortParser(sort).sortBy, sortParser(sort).sortDirection)

  const { data: history, isFetching: isHistoryFetching } =
    useDataImpersonationLogDetail(id)
  const { data: items, isFetching: isItemsFetching } =
    useDataImpersonationLogItems(id, builder.build())

  const columns = useMemo(() => getImpersonationItemsTableColumns(), [])
  const totalPages = items?.meta.totalPages ?? 0

  const { table } = useDataTable({
    data: items?.data ?? [],
    columns,
    pageCount: totalPages,
    initialState: {
      columnPinning: { right: [] },
      sorting: [{ id: ItemColumnKey.createdAt, desc: true }],
    },
    getRowId: (row) => row.id,
  })

  if (isHistoryFetching) return <DataLoader />

  if (!history) return <NotFoundError />

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
        <div className='flex items-center justify-between gap-2'>
          <div>
            <h1 className='text-2xl font-bold'>Impersonation Session</h1>
            <p className='text-muted-foreground'>
              See who impersonated whom and every audited action in this
              session.
            </p>
          </div>
          <Button onClick={() => navigate(-1)} variant='outline'>
            <ArrowLeftIcon size={16} />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Session summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Descriptions>
              <DescriptionItem
                label='Admin'
                value={formatLogUser(history.admin, history.adminId)}
              />
              <DescriptionItem
                label='Target user'
                value={formatLogUser(history.targetUser, history.targetUserId)}
              />
              <DescriptionItem label='Reason' value={history.reason || '-'} />
              <DescriptionItem label='Status' value={history.status} />
              <DescriptionItem
                label='Started at'
                value={formatDate(history.startedAt)}
              />
              <DescriptionItem
                label='Stopped at'
                value={formatDate(history.stoppedAt)}
              />
              <DescriptionItem
                label='Actions'
                value={String(history.itemsCount ?? 0)}
              />
              <DescriptionItem
                label='Session ID'
                value={history.sessionId || '-'}
              />
            </Descriptions>
          </CardContent>
        </Card>

        <div>
          <h2 className='mb-3 text-lg font-semibold'>Action items</h2>
          <DataTable table={table} isFetching={isItemsFetching}>
            <DataTableToolbar table={table}>
              <DataTableSortList table={table} />
            </DataTableToolbar>
          </DataTable>
        </div>
      </Main>
    </>
  )
}
