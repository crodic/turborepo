import { useMemo } from 'react'
import { Download } from 'lucide-react'
import { parseAsString } from 'nuqs'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { PaginateQueryBuilder } from '@/lib/query-builder'
import { sortParser } from '@/lib/utils'
import { useDataTable } from '@/hooks/use-data-table'
import useGetFilterParams from '@/hooks/use-get-filter-params'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableSortList } from '@/components/data-table/data-table-sort-list'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { downloadCsv, useDataPolarSubscriptions } from '../queries'
import type { PolarSubscriptionSchema } from '../schema'
import { getSubscriptionsTableColumns } from './columns'

const subscriptionFilterParsers = {
  customerEmail: parseAsString,
  status: parseAsString,
  productName: parseAsString,
} as const

export function PagePolarSubscriptions() {
  const { t } = useTranslation()
  const { ability } = useAuthStore()
  const canManage = ability.can('update', 'PAYMENT')

  const {
    page,
    perPage,
    sorting: sort,
    filter,
    search,
  } = useGetFilterParams<
    PolarSubscriptionSchema,
    typeof subscriptionFilterParsers
  >({
    allowedSorts: [
      'id',
      'customerEmail',
      'status',
      'amount',
      'currentPeriodEnd',
      'createdAt',
    ],
    filterParsers: subscriptionFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('customerEmail', filter.customerEmail)
    .eq('status', filter.status)
    .applySorts(sortParser(sort))

  if (search) {
    builder.search(search)
  }

  const { data, isFetching } = useDataPolarSubscriptions(builder.build())

  const columns = useMemo(
    () => getSubscriptionsTableColumns({ canManage }),
    [canManage]
  )

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: data?.meta.totalPages ?? 0,
    getRowId: (row) => String(row.id),
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
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              {t('polar.subscriptions.title', {
                defaultValue: 'Subscriptions',
              })}
            </h2>
            <p className='text-muted-foreground'>
              {t('polar.subscriptions.description', {
                defaultValue:
                  'Monitor recurring billing subscriptions, plan tiers, and manage period-end cancellations or immediate revocations.',
              })}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={() =>
                downloadCsv(
                  '/admin/polar/subscriptions/export',
                  'polar-subscriptions.csv'
                )
              }
            >
              <Download className='mr-1.5 size-4' />
              Export CSV
            </Button>
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

export default PagePolarSubscriptions
