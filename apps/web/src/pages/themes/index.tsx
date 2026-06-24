import { useMemo } from 'react'
import { PlusIcon } from 'lucide-react'
import { parseAsString } from 'nuqs'
import { useNavigate } from 'react-router'
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
import { getThemesTableColumns } from './columns'
import { useDataThemeOverview } from './queries'
import { ColumnKey, type ThemeSchema } from './schema'

const themeFilterParsers = {
  name: parseAsString,
  slug: parseAsString,
  status: parseAsString,
} as const

export function PageThemeOverview() {
  const navigate = useNavigate()
  const { ability } = useAuthStore()
  const {
    page,
    perPage,
    sorting: sort,
    filter,
  } = useGetFilterParams<ThemeSchema, typeof themeFilterParsers>({
    allowedSorts: [ColumnKey.name, ColumnKey.status, ColumnKey.updatedAt],
    filterParsers: themeFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('name', filter.name)
    .ilike('slug', filter.slug)
    .eq('status', filter.status)
    .sortBy(sortParser(sort).sortBy, sortParser(sort).sortDirection)

  const { data, isFetching } = useDataThemeOverview(builder.build())
  const columns = useMemo(() => getThemesTableColumns(), [])

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: data?.meta.totalPages ?? 0,
    initialState: {
      columnPinning: { right: ['actions'] },
    },
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
            <h2 className='text-2xl font-bold tracking-tight'>Themes</h2>
            <p className='text-muted-foreground'>
              Manage runtime themes and edit design tokens from one place.
            </p>
          </div>
          {ability.can('create', 'THEME') && (
            <Button onClick={() => navigate('/themes/create')}>
              <PlusIcon className='size-4' />
              Create theme
            </Button>
          )}
        </div>

        <DataTable
          table={table}
          onClickRowAction={(theme) => navigate(`/themes/${theme.id}/show`)}
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
