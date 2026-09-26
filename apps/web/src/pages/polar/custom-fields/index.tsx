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
import {
  useDataPolarCustomFields,
  useMutationSyncCustomFields,
} from '../queries'
import type { PolarCustomFieldSchema } from '../schema'
import { getCustomFieldsTableColumns } from './columns'
import { CustomFieldDialog } from './custom-field-dialog'

const customFieldFilterParsers = {
  name: parseAsString,
  slug: parseAsString,
  type: parseAsString,
} as const

export function PagePolarCustomFields() {
  const { t } = useTranslation()
  const { ability } = useAuthStore()
  const canManage =
    ability.can('update', 'POLAR_CUSTOM_FIELD') ||
    ability.can('create', 'POLAR_CUSTOM_FIELD')
  const syncMutation = useMutationSyncCustomFields()

  const [dialogOpen, setDialogOpen] = useState(false)

  const {
    page,
    perPage,
    sorting: sort,
    filter,
    search,
  } = useGetFilterParams<
    PolarCustomFieldSchema,
    typeof customFieldFilterParsers
  >({
    allowedSorts: ['id', 'name', 'slug', 'type', 'required', 'createdAt'],
    filterParsers: customFieldFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('name', filter.name)
    .ilike('slug', filter.slug)
    .eq('type', filter.type)
    .applySorts(sortParser(sort))

  if (search) {
    builder.search(search)
  }

  const { data, isFetching } = useDataPolarCustomFields(builder.build())
  const columns = useMemo(() => getCustomFieldsTableColumns(), [])

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
              {t('polar.customFields.title', {
                defaultValue: 'Custom Checkout Fields',
              })}
            </h2>
            <p className='text-muted-foreground'>
              {t('polar.customFields.description', {
                defaultValue:
                  'Collect extra metadata from customers at checkout, such as tax IDs, Discord IDs, or company handles.',
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
              <Button onClick={() => setDialogOpen(true)}>
                <PlusIcon className='mr-1.5 size-4' />
                Create Field
              </Button>
            )}
          </div>
        </div>

        <DataTable table={table} isFetching={isFetching}>
          <DataTableToolbar table={table}>
            <DataTableSortList table={table} />
          </DataTableToolbar>
        </DataTable>

        <CustomFieldDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </Main>
    </>
  )
}

export default PagePolarCustomFields
