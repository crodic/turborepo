import { useMemo, useState } from 'react'
import { PlusIcon, RefreshCw } from 'lucide-react'
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
import { useDataPolarDiscounts, useMutationSyncDiscounts } from '../queries'
import type { PolarDiscountSchema } from '../schema'
import { getDiscountsTableColumns } from './columns'
import { DiscountDialog } from './discount-dialog'

const discountFilterParsers = {
  name: parseAsString,
  code: parseAsString,
  type: parseAsString,
} as const

export function PagePolarDiscounts() {
  const { t } = useTranslation()
  const { ability } = useAuthStore()
  const canManage =
    ability.can('update', 'POLAR_DISCOUNT') ||
    ability.can('create', 'POLAR_DISCOUNT')
  const syncMutation = useMutationSyncDiscounts()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDiscount, setEditingDiscount] =
    useState<PolarDiscountSchema | null>(null)

  const {
    page,
    perPage,
    sorting: sort,
    filter,
    search,
  } = useGetFilterParams<PolarDiscountSchema, typeof discountFilterParsers>({
    allowedSorts: ['id', 'name', 'code', 'type', 'duration', 'createdAt'],
    filterParsers: discountFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('name', filter.name)
    .ilike('code', filter.code)
    .eq('type', filter.type)
    .applySorts(sortParser(sort))

  if (search) {
    builder.search(search)
  }

  const { data, isFetching } = useDataPolarDiscounts(builder.build())

  const handleEdit = (discount: PolarDiscountSchema) => {
    setEditingDiscount(discount)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingDiscount(null)
    setDialogOpen(true)
  }

  const columns = useMemo(
    () => getDiscountsTableColumns({ onEdit: handleEdit }),
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
              {t('polar.discounts.title', {
                defaultValue: 'Discounts & Coupons',
              })}
            </h2>
            <p className='text-muted-foreground'>
              {t('polar.discounts.description', {
                defaultValue:
                  'Manage percentage and fixed-amount discounts, promo codes, and redemption limits.',
              })}
            </p>
          </div>
          <div className='flex items-center gap-2'>
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
              <Button onClick={handleCreate}>
                <PlusIcon className='mr-1.5 size-4' />
                Create Discount
              </Button>
            )}
          </div>
        </div>

        <DataTable table={table} isFetching={isFetching}>
          <DataTableToolbar table={table}>
            <DataTableSortList table={table} />
          </DataTableToolbar>
        </DataTable>

        <DiscountDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          discount={editingDiscount}
        />
      </Main>
    </>
  )
}

export default PagePolarDiscounts
