import { useMemo, useState } from 'react'
import { Package, RefreshCw, ExternalLink, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useDataTable } from '@/hooks/use-data-table'
import useGetFilterParams from '@/hooks/use-get-filter-params'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfirmActionDialog } from '../components/confirm-action-dialog'
import {
  useDataPolarProducts,
  useMutationRefreshPolarCache,
  useMutationArchivePolarProduct,
} from '../queries'
import { getProductsColumns } from './columns'
import { ProductFormDialog } from './components/product-form-dialog'

export function PagePolarProducts() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { mutate: refreshPolarCache, isPending: isRefreshingCache } =
    useMutationRefreshPolarCache()
  const { mutate: archiveProduct, isPending: isArchiving } =
    useMutationArchivePolarProduct()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [archivingProduct, setArchivingProduct] = useState<any | null>(null)

  const { page, perPage, search } = useGetFilterParams<
    any,
    Record<string, never>
  >({
    allowedSorts: ['name'],
    filterParsers: {},
  })

  const { data, isFetching } = useDataPolarProducts({
    query: search || undefined,
    page,
    limit: perPage,
  })

  const columns = useMemo(
    () =>
      getProductsColumns({
        onViewDetail: (product) => {
          navigate(`/polar/products/${product.id}`)
        },
        onEdit: (product) => {
          setEditingProduct(product)
        },
        onArchive: (product) => {
          setArchivingProduct(product)
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

  const handleConfirmArchive = () => {
    if (!archivingProduct) return
    archiveProduct(archivingProduct.id, {
      onSuccess: () => {
        setArchivingProduct(null)
      },
    })
  }

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-2'>
          <Package className='text-primary h-5 w-5' />
          <h1 className='text-lg font-semibold tracking-tight'>
            Polar Products
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
              {t('polar.products.title', { defaultValue: 'Products & Tiers' })}
            </h2>
            <p className='text-muted-foreground text-sm'>
              {t('polar.products.description', {
                defaultValue:
                  'Live catalog and pricing tiers fetched directly from Polar gateway',
              })}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refreshPolarCache('products')}
              disabled={isFetching || isRefreshingCache}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isFetching || isRefreshingCache ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() =>
                window.open('https://sandbox.polar.sh/dashboard', '_blank')
              }
            >
              <ExternalLink className='mr-2 h-4 w-4' />
              Manage on Polar
            </Button>
            <Button
              size='sm'
              onClick={() => {
                setEditingProduct(null)
                setIsCreateOpen(true)
              }}
            >
              <Plus className='mr-2 h-4 w-4' />
              Create Product
            </Button>
          </div>
        </div>

        {/* Standard DataTable */}
        <DataTable
          table={table}
          isFetching={isFetching}
          onClickRowAction={(row) => {
            navigate(`/polar/products/${row.id}`)
          }}
        >
          <DataTableToolbar table={table} />
        </DataTable>

        {/* Create / Edit Dialog */}
        <ProductFormDialog
          open={isCreateOpen || Boolean(editingProduct)}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateOpen(false)
              setEditingProduct(null)
            }
          }}
          product={editingProduct}
        />

        {/* Archive Confirmation Dialog */}
        <ConfirmActionDialog
          open={Boolean(archivingProduct)}
          onOpenChange={(open) => {
            if (!open) setArchivingProduct(null)
          }}
          title='Archive Product'
          description={`Are you sure you want to archive "${archivingProduct?.name}"? Once archived, new customers cannot purchase this product. Existing subscriptions remain active.`}
          confirmText='Archive Product'
          variant='destructive'
          isPending={isArchiving}
          onConfirm={handleConfirmArchive}
        />
      </Main>
    </>
  )
}

export default PagePolarProducts
