import { useMemo, useState } from 'react'
import { Download, PlusIcon, RefreshCw } from 'lucide-react'
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
import {
  downloadCsv,
  useDataPolarCustomers,
  useMutationSyncCustomers,
} from '../queries'
import type { PolarCustomerSchema } from '../schema'
import { getCustomersTableColumns } from './columns'
import { CustomerDetailsModal } from './customer-details-modal'
import { CustomerDialog } from './customer-dialog'

const customerFilterParsers = {
  email: parseAsString,
  polarCustomerId: parseAsString,
} as const

export function PagePolarCustomers() {
  const { t } = useTranslation()
  const { ability } = useAuthStore()
  const canManage =
    ability.can('update', 'POLAR_CUSTOMER') ||
    ability.can('create', 'POLAR_CUSTOMER')
  const syncMutation = useMutationSyncCustomers()

  const [createOpen, setCreateOpen] = useState(false)
  const [detailsCustomer, setDetailsCustomer] =
    useState<PolarCustomerSchema | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const {
    page,
    perPage,
    sorting: sort,
    filter,
    search,
  } = useGetFilterParams<PolarCustomerSchema, typeof customerFilterParsers>({
    allowedSorts: ['id', 'email', 'polarCustomerId', 'createdAt'],
    filterParsers: customerFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('email', filter.email)
    .ilike('polarCustomerId', filter.polarCustomerId)
    .applySorts(sortParser(sort))

  if (search) {
    builder.search(search)
  }

  const { data, isFetching } = useDataPolarCustomers(builder.build())

  const handleViewDetails = (customer: PolarCustomerSchema) => {
    setDetailsCustomer(customer)
    setDetailsOpen(true)
  }

  const columns = useMemo(
    () => getCustomersTableColumns({ onViewDetails: handleViewDetails }),
    []
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
              {t('polar.customers.title', { defaultValue: 'Polar Customers' })}
            </h2>
            <p className='text-muted-foreground'>
              {t('polar.customers.description', {
                defaultValue:
                  'View all synced Polar customer profiles, active payment methods, and live entitlement states.',
              })}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={() =>
                downloadCsv(
                  '/admin/polar/customers/export',
                  'polar-customers.csv'
                )
              }
            >
              <Download className='mr-1.5 size-4' />
              Export CSV
            </Button>
            {canManage && (
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
            )}
            {canManage && (
              <Button onClick={() => setCreateOpen(true)}>
                <PlusIcon className='mr-1.5 size-4' />
                Create Customer
              </Button>
            )}
          </div>
        </div>

        <DataTable table={table} isFetching={isFetching}>
          <DataTableToolbar table={table}>
            <DataTableSortList table={table} />
          </DataTableToolbar>
        </DataTable>

        <CustomerDialog open={createOpen} onOpenChange={setCreateOpen} />
        <CustomerDetailsModal
          customer={detailsCustomer}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      </Main>
    </>
  )
}

export default PagePolarCustomers
