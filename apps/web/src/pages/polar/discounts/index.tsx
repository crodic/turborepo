import { useMemo } from 'react'
import { Tag, RefreshCw, Plus, ExternalLink } from 'lucide-react'
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
import { useDataPolarDiscounts } from '../queries'
import { getDiscountsColumns } from './columns'

export function PagePolarDiscounts() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { page, perPage, search } = useGetFilterParams<
    any,
    Record<string, never>
  >({
    allowedSorts: ['name'],
    filterParsers: {},
  })

  const { data, isFetching, refetch } = useDataPolarDiscounts({
    query: search || undefined,
    page,
    limit: perPage,
  })

  const columns = useMemo(
    () =>
      getDiscountsColumns({
        onViewDetail: (discount) => {
          navigate(`/polar/discounts/${discount.id}`)
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
          <Tag className='text-primary h-5 w-5' />
          <h1 className='text-lg font-semibold tracking-tight'>
            Discounts & Coupons
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
              {t('polar.discounts.title', {
                defaultValue: 'Discounts & Coupons',
              })}
            </h2>
            <p className='text-muted-foreground text-sm'>
              {t('polar.discounts.description', {
                defaultValue:
                  'Promotional coupons & discounts managed directly via Polar SDK',
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
            <Button
              size='sm'
              onClick={() =>
                window.open('https://sandbox.polar.sh/dashboard', '_blank')
              }
            >
              <Plus className='mr-2 h-4 w-4' />
              Create on Polar
              <ExternalLink className='ml-1.5 h-3.5 w-3.5' />
            </Button>
          </div>
        </div>

        {/* Standard DataTable */}
        <DataTable
          table={table}
          isFetching={isFetching}
          onClickRowAction={(row) => {
            navigate(`/polar/discounts/${row.id}`)
          }}
        >
          <DataTableToolbar table={table} />
        </DataTable>
      </Main>
    </>
  )
}

export default PagePolarDiscounts
