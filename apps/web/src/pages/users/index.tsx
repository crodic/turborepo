import { useMemo } from 'react'
import { PlusIcon } from 'lucide-react'
import { parseAsArrayOf, parseAsInteger, parseAsString } from 'nuqs'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { PaginateQueryBuilder } from '@/lib/query-builder'
import { normalizeDate, sortParser } from '@/lib/utils'
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
import { useDataUserOverview } from '../users/queries'
import { ColumnKey, type UserSchema } from '../users/schema'
import { getUsersTableColumns } from './columns'
import { UsersTableActionBar } from './users-table-action-bar'

const userFilterParsers = {
  [ColumnKey.email]: parseAsString,
  [ColumnKey.createdAt]: parseAsArrayOf(parseAsInteger, ','),
  [ColumnKey.fullName]: parseAsString,
  [ColumnKey.id]: parseAsString,
} as const

export function PageUserOverview() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleRowClick = (row: UserSchema) => {
    navigate(`/users/${row.id}/show`)
  }

  const columns = useMemo(() => getUsersTableColumns(), [])

  const {
    page,
    perPage,
    sorting: sort,
    filter,
    search,
  } = useGetFilterParams<UserSchema, typeof userFilterParsers>({
    allowedSorts: [ColumnKey.createdAt],
    filterParsers: userFilterParsers,
  })

  const createdFrom = normalizeDate(filter.createdAt?.[0])
  const createdTo = normalizeDate(filter.createdAt?.[1])

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .btw('createdAt', createdFrom, createdTo)
    .ilike('email', filter.email)
    .ilike('fullName', filter.fullName)
    .eq('id', filter.id)
    .sortBy(sortParser(sort).sortBy, sortParser(sort).sortDirection)
    .search(search)

  const { data, isFetching } = useDataUserOverview(builder.build())

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: data?.meta.totalPages ?? -1,
    initialState: {
      columnPinning: { right: ['actions'] },
    },
    getRowId: (originalRow) => originalRow.id,
    clearOnDefault: true,
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
              {t('users.overview.title')}
            </h2>
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
          actionBar={<UsersTableActionBar table={table} />}
          onClickRowAction={handleRowClick}
          isFetching={isFetching}
        >
          <DataTableToolbar table={table}>
            <DataTableSortList table={table} align='end' />
          </DataTableToolbar>
        </DataTable>
      </Main>
    </>
  )
}
