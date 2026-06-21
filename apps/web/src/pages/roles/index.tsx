import { useMemo } from 'react'
import { PlusIcon } from 'lucide-react'
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
import { getRolesTableColumns } from './columns'
import { useDataRoleOverview } from './queries'
import { ColumnKey, type RoleSchema } from './schema'

const rolesFilterParsers = {
  name: parseAsString,
} as const

export function PageRoleOverview() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const {
    page,
    perPage,
    sorting: sort,
    filter,
  } = useGetFilterParams<RoleSchema, typeof rolesFilterParsers>({
    allowedSorts: [ColumnKey.name, ColumnKey.createdAt],
    filterParsers: rolesFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('name', filter.name)
    .sortBy(sortParser(sort).sortBy, sortParser(sort).sortDirection)

  const { data, isFetching } = useDataRoleOverview(builder.build())

  const totalPages = data?.meta.totalPages ?? 0

  const columns = useMemo(() => getRolesTableColumns(), [])

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns: columns,
    pageCount: totalPages,
    initialState: {
      columnPinning: { right: ['actions'] },
    },
    getRowId: (row) => row.id,
  })

  const handleRowClick = (role: RoleSchema) => {
    navigate(`/roles/${role.id}/show`)
  }

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
              {t('roles.overview.title')}
            </h2>
            <p className='text-muted-foreground'>
              {t('roles.overview.description')}
            </p>
          </div>
          <div>
            <Button onClick={() => navigate('create')}>
              <PlusIcon />
              {t('buttons.create')}
            </Button>
          </div>
        </div>
        <DataTable
          table={table}
          onClickRowAction={handleRowClick}
          isFetching={isFetching}
        >
          <DataTableToolbar table={table}>
            <DataTableSortList table={table} />
          </DataTableToolbar>
        </DataTable>
      </Main>
    </>
  )
}
