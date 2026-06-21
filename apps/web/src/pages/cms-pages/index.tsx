import { useMemo } from 'react'
import { PlusIcon } from 'lucide-react'
import { parseAsString } from 'nuqs'
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
import { getCmsPagesTableColumns } from './columns'
import { useDataCmsPageOverview } from './queries'
import { ColumnKey, type CmsPageSchema } from './schema'

const pageFilterParsers = {
  title: parseAsString,
  slug: parseAsString,
  status: parseAsString,
} as const

export function PageCmsPageOverview() {
  const navigate = useNavigate()
  const {
    page,
    perPage,
    sorting: sort,
    filter,
  } = useGetFilterParams<CmsPageSchema, typeof pageFilterParsers>({
    allowedSorts: [
      ColumnKey.title,
      ColumnKey.slug,
      ColumnKey.status,
      ColumnKey.updatedAt,
    ],
    filterParsers: pageFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('title', filter.title)
    .ilike('slug', filter.slug)
    .eq('status', filter.status)
    .sortBy(sortParser(sort).sortBy, sortParser(sort).sortDirection)

  const { data, isFetching } = useDataCmsPageOverview(builder.build())
  const columns = useMemo(() => getCmsPagesTableColumns(), [])
  const { table } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: data?.meta.totalPages ?? 0,
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
            <h2 className='text-2xl font-bold tracking-tight'>Pages</h2>
            <p className='text-muted-foreground'>
              Build and publish dynamic client pages with SEO metadata.
            </p>
          </div>
          <Button onClick={() => navigate('create')}>
            <PlusIcon />
            Create
          </Button>
        </div>
        <DataTable
          table={table}
          isFetching={isFetching}
          onClickRowAction={(row) => navigate(`/cms-pages/${row.id}/show`)}
        >
          <DataTableToolbar table={table}>
            <DataTableSortList table={table} />
          </DataTableToolbar>
        </DataTable>
      </Main>
    </>
  )
}
