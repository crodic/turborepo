import { useMemo } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { PaginateQueryBuilder } from '@/lib/query-builder'
import { sortParser } from '@/lib/utils'
import { useDataTable } from '@/hooks/use-data-table'
import useGetFilterParams from '@/hooks/use-get-filter-params'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableSortList } from '@/components/data-table/data-table-sort-list'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useDataPolarWebhookEvents } from '../queries'
import { getWebhookEventsColumns } from './columns'

export function PagePolarWebhookEvents() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const {
    page,
    perPage,
    sorting: sort,
    search,
  } = useGetFilterParams<any, Record<string, never>>({
    allowedSorts: ['id', 'eventType', 'status', 'createdAt'],
    filterParsers: {},
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .applySorts(sortParser(sort))

  if (search) {
    builder.search(search)
  }

  const { data, isFetching, refetch } = useDataPolarWebhookEvents(
    builder.build()
  )

  const columns = useMemo(
    () =>
      getWebhookEventsColumns({
        onViewDetail: (event) => {
          navigate(`/polar/webhook-events/${event.id}`)
        },
      }),
    [navigate]
  )

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: data?.meta?.totalPages ?? 0,
    getRowId: (row) => String(row.id),
  })

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-2'>
          <Activity className='text-primary h-5 w-5' />
          <h1 className='text-lg font-semibold tracking-tight'>
            Webhook Events
          </h1>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        {/* Top Header */}
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              {t('polar.webhookEvents.title', {
                defaultValue: 'Polar Webhook Events',
              })}
            </h2>
            <p className='text-muted-foreground text-sm'>
              {t('polar.webhookEvents.description', {
                defaultValue:
                  'Tracked real-time asynchronous webhook calls from Polar gateway',
              })}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Standard DataTable */}
        <DataTable
          table={table}
          isFetching={isFetching}
          onClickRowAction={(row) => {
            navigate(`/polar/webhook-events/${row.id}`)
          }}
        >
          <DataTableToolbar table={table}>
            <DataTableSortList table={table} />
          </DataTableToolbar>
        </DataTable>
      </Main>
    </>
  )
}

export default PagePolarWebhookEvents
