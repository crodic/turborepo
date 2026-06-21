import { useMemo } from 'react'
import { parseAsString } from 'nuqs'
import { useNavigate } from 'react-router'
import { PaginateQueryBuilder } from '@/lib/query-builder'
import { sortParser } from '@/lib/utils'
import { useDataTable } from '@/hooks/use-data-table'
import useGetFilterParams from '@/hooks/use-get-filter-params'
import { ConfigDrawer } from '@/components/config-drawer'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableSortList } from '@/components/data-table/data-table-sort-list'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { getPermissionsTableColumns } from './columns'
import { useDataPermissionOverview } from './queries'
import { ColumnKey, type PermissionSchema } from './schema'

const permissionFilterParsers = {
  name: parseAsString,
  group: parseAsString,
} as const

export function PagePermissionOverview() {
  const navigate = useNavigate()

  const {
    page,
    perPage,
    sorting: sort,
    filter,
  } = useGetFilterParams<PermissionSchema, typeof permissionFilterParsers>({
    allowedSorts: [ColumnKey.name, ColumnKey.group, ColumnKey.updatedAt],
    filterParsers: permissionFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('name', filter.name)
    .ilike('group', filter.group)
    .sortBy(sortParser(sort).sortBy, sortParser(sort).sortDirection)

  const { data, isFetching } = useDataPermissionOverview(builder.build())
  const columns = useMemo(() => getPermissionsTableColumns(), [])

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: data?.meta.totalPages ?? 0,
    initialState: {
      columnPinning: { right: ['actions'] },
    },
    getRowId: (row) => row.id,
  })

  const handleRowClick = (permission: PermissionSchema) => {
    navigate(`/permissions/${permission.id}/show`)
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
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Permissions</h2>
          <p className='text-muted-foreground'>
            Review permission keys and maintain display metadata.
          </p>
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
