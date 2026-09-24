import { useMemo } from 'react'
import { PlusIcon, RefreshCw } from 'lucide-react'
import { parseAsString } from 'nuqs'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
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
import { getPaymentProductsTableColumns } from './columns'
import {
  useDataPaymentProductsOverview,
  useMutationSyncProductsFromPolar,
} from './queries'
import { ColumnKey, type PaymentProductSchema } from './schema'

const productFilterParsers = {
  planSlug: parseAsString,
  interval: parseAsString,
} as const

export function PagePaymentProductsOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const syncMutation = useMutationSyncProductsFromPolar()
  const {
    page,
    perPage,
    sorting: sort,
    filter,
  } = useGetFilterParams<PaymentProductSchema, typeof productFilterParsers>({
    allowedSorts: [
      ColumnKey.sortOrder,
      ColumnKey.name,
      ColumnKey.planSlug,
      ColumnKey.price,
      ColumnKey.createdAt,
    ],
    filterParsers: productFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('planSlug', filter.planSlug)
    .eq('interval', filter.interval)
    .applySorts(sortParser(sort))

  const { data, isFetching } = useDataPaymentProductsOverview(builder.build())
  const columns = useMemo(() => getPaymentProductsTableColumns(), [])

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: data?.meta.totalPages ?? 0,
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
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              {t('paymentProducts.title', { defaultValue: 'Payment Products' })}
            </h2>
            <p className='text-muted-foreground'>
              {t('paymentProducts.description', {
                defaultValue:
                  'Manage SaaS pricing tiers, intervals, and Polar Product ID gateway integrations.',
              })}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              <RefreshCw
                className={`mr-1.5 size-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
              />
              {syncMutation.isPending ? 'Syncing...' : 'Sync from Polar'}
            </Button>
            <Button onClick={() => navigate('create')}>
              <PlusIcon />
              {t('buttons.create', { defaultValue: 'Add Custom Plan' })}
            </Button>
          </div>
        </div>
        <DataTable
          table={table}
          isFetching={isFetching}
          onClickRowAction={(row) => {
            navigate(`/payment-products/${row.id}/edit`)
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

export default PagePaymentProductsOverview
