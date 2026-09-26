import { useMemo, useState } from 'react'
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
import { downloadCsv, useDataPolarOrders } from '../queries'
import type { PolarOrderSchema } from '../schema'
import { getOrdersTableColumns } from './columns'
import { OrderDetailSheet } from './components/order-detail-sheet'
import { DirectRefundDialog } from './direct-refund-dialog'

const orderFilterParsers = {
  customerEmail: parseAsString,
  status: parseAsString,
} as const

export function PagePolarOrders() {
  const { t } = useTranslation()
  const { ability } = useAuthStore()
  const canManageRefund = ability.can('update', 'PAYMENT')

  const [selectedOrder, setSelectedOrder] = useState<PolarOrderSchema | null>(
    null
  )
  const [refundOpen, setRefundOpen] = useState(false)
  const [sheetOrder, setSheetOrder] = useState<PolarOrderSchema | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const {
    page,
    perPage,
    sorting: sort,
    filter,
    search,
  } = useGetFilterParams<PolarOrderSchema, typeof orderFilterParsers>({
    allowedSorts: ['id', 'amount', 'status', 'createdAt', 'updatedAt'],
    filterParsers: orderFilterParsers,
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

  const { data, isFetching } = useDataPolarOrders(builder.build())

  const handleRefund = (order: PolarOrderSchema) => {
    setSelectedOrder(order)
    setRefundOpen(true)
  }

  const columns = useMemo(
    () =>
      getOrdersTableColumns({
        canManageRefund,
        onRefund: handleRefund,
      }),
    [canManageRefund]
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
              {t('polar.orders.title', { defaultValue: 'Orders & Invoices' })}
            </h2>
            <p className='text-muted-foreground'>
              {t('polar.orders.description', {
                defaultValue:
                  'View comprehensive payment receipts, invoice PDFs, tax breakdowns, and trigger direct refunds.',
              })}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={() =>
                downloadCsv('/admin/polar/orders/export', 'polar-orders.csv')
              }
            >
              <Download className='mr-1.5 size-4' />
              Export CSV
            </Button>
          </div>
        </div>

        <DataTable
          table={table}
          isFetching={isFetching}
          onClickRowAction={(row) => {
            setSheetOrder(row)
            setSheetOpen(true)
          }}
        >
          <DataTableToolbar table={table}>
            <DataTableSortList table={table} />
          </DataTableToolbar>
        </DataTable>

        <OrderDetailSheet
          order={sheetOrder}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          canManageRefund={canManageRefund}
          onRefund={handleRefund}
        />

        <DirectRefundDialog
          order={selectedOrder}
          open={refundOpen}
          onOpenChange={setRefundOpen}
        />
      </Main>
    </>
  )
}

export default PagePolarOrders
