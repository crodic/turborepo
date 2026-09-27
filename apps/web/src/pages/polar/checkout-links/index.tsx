import { useMemo, useState } from 'react'
import { Link2, RefreshCw, Plus, ExternalLink } from 'lucide-react'
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
  useDataPolarCheckoutLinks,
  useMutationRefreshPolarCache,
  useMutationDeletePolarCheckoutLink,
} from '../queries'
import { getCheckoutLinksColumns } from './columns'
import { CheckoutLinkFormDialog } from './components/checkout-link-form-dialog'

export function PagePolarCheckoutLinks() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { mutate: refreshPolarCache, isPending: isRefreshingCache } =
    useMutationRefreshPolarCache()
  const { mutate: deleteLink, isPending: isDeleting } =
    useMutationDeletePolarCheckoutLink()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<any | null>(null)
  const [deletingLink, setDeletingLink] = useState<any | null>(null)

  const { page, perPage } = useGetFilterParams<any, Record<string, never>>({
    allowedSorts: ['label'],
    filterParsers: {},
  })

  const { data, isFetching } = useDataPolarCheckoutLinks({
    page,
    limit: perPage,
  })

  const columns = useMemo(
    () =>
      getCheckoutLinksColumns({
        onViewDetail: (link) => {
          navigate(`/polar/checkout-links/${link.id}`)
        },
        onEdit: (link) => {
          setEditingLink(link)
        },
        onDelete: (link) => {
          setDeletingLink(link)
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

  const handleConfirmDelete = () => {
    if (!deletingLink) return
    deleteLink(deletingLink.id, {
      onSuccess: () => {
        setDeletingLink(null)
      },
    })
  }

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-2'>
          <Link2 className='text-primary h-5 w-5' />
          <h1 className='text-lg font-semibold tracking-tight'>
            Checkout Links
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
              {t('polar.checkoutLinks.title', {
                defaultValue: 'Checkout Links',
              })}
            </h2>
            <p className='text-muted-foreground text-sm'>
              {t('polar.checkoutLinks.description', {
                defaultValue:
                  'Pre-configured shareable checkout links hosted on Polar',
              })}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refreshPolarCache('checkout-links')}
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
                setEditingLink(null)
                setIsCreateOpen(true)
              }}
            >
              <Plus className='mr-2 h-4 w-4' />
              Create Checkout Link
            </Button>
          </div>
        </div>

        {/* Standard DataTable */}
        <DataTable
          table={table}
          isFetching={isFetching}
          onClickRowAction={(row) => {
            navigate(`/polar/checkout-links/${row.id}`)
          }}
        >
          <DataTableToolbar table={table} />
        </DataTable>

        {/* Create / Edit Dialog */}
        <CheckoutLinkFormDialog
          open={isCreateOpen || Boolean(editingLink)}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateOpen(false)
              setEditingLink(null)
            }
          }}
          checkoutLink={editingLink}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmActionDialog
          open={Boolean(deletingLink)}
          onOpenChange={(open) => {
            if (!open) setDeletingLink(null)
          }}
          title='Delete Checkout Link'
          description={`Are you sure you want to permanently delete checkout link "${deletingLink?.label || deletingLink?.id}"? This link will no longer be accessible by customers.`}
          confirmText='Delete Checkout Link'
          variant='destructive'
          isPending={isDeleting}
          onConfirm={handleConfirmDelete}
        />
      </Main>
    </>
  )
}

export default PagePolarCheckoutLinks
