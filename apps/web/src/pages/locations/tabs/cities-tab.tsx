import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon } from 'lucide-react'
import { parseAsArrayOf, parseAsString } from 'nuqs'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PaginateQueryBuilder } from '@/lib/query-builder'
import { sortParser } from '@/lib/utils'
import { useDataTable } from '@/hooks/use-data-table'
import useGetFilterParams from '@/hooks/use-get-filter-params'
import { Button } from '@/components/ui/button'
import { DeleteAlertDialog } from '@/components/common/delete-alert-dialog'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableSortList } from '@/components/data-table/data-table-sort-list'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { getCitiesTableColumns } from '../columns/cities-columns'
import { CityDialog } from '../dialogs/city-dialog'
import { apiDeleteCity, useCitiesQuery } from '../queries'
import { CityColumnKey, type CitySchema } from '../schema'

const cityFilterParsers = {
  [CityColumnKey.name]: parseAsString,
  [CityColumnKey.stateCode]: parseAsArrayOf(parseAsString, ','),
  [CityColumnKey.countryCode]: parseAsArrayOf(parseAsString, ','),
  [CityColumnKey.code]: parseAsString,
} as const

export function CitiesTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCity, setSelectedCity] = useState<CitySchema | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cityToDelete, setCityToDelete] = useState<CitySchema | null>(null)

  const {
    page,
    perPage,
    sorting: sort,
    filter,
    search,
  } = useGetFilterParams<CitySchema, typeof cityFilterParsers>({
    allowedSorts: [
      CityColumnKey.name,
      CityColumnKey.stateCode,
      CityColumnKey.countryCode,
      CityColumnKey.code,
      CityColumnKey.createdAt,
    ],
    filterParsers: cityFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('name', filter.name)
    .in('stateCode', filter.stateCode || [])
    .in('countryCode', filter.countryCode || [])
    .ilike('code', filter.code)
    .applySorts(sortParser(sort))
    .search(search)

  const { data, isFetching } = useCitiesQuery(builder.build())

  const handleEdit = useCallback((city: CitySchema) => {
    setSelectedCity(city)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback((city: CitySchema) => {
    setCityToDelete(city)
    setDeleteDialogOpen(true)
  }, [])

  const columns = useMemo(
    () =>
      getCitiesTableColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
      }),
    [handleEdit, handleDelete]
  )

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: data?.meta.totalPages ?? 0,
    initialState: {
      columnPinning: { right: ['actions'] },
    },
    getRowId: (row) => row.id,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteCity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] })
      queryClient.invalidateQueries({ queryKey: ['public-cities'] })
      toast.success(t('locations.city.deleted', 'City deleted successfully'))
      setDeleteDialogOpen(false)
      setCityToDelete(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Delete failed')
    },
  })

  return (
    <div className='space-y-4'>
      <DataTable table={table} isFetching={isFetching}>
        <DataTableToolbar table={table}>
          <Button
            size='sm'
            onClick={() => {
              setSelectedCity(null)
              setDialogOpen(true)
            }}
          >
            <PlusIcon className='mr-1 size-4' />
            {t('locations.city.createBtn', 'Add City')}
          </Button>
          <DataTableSortList table={table} />
        </DataTableToolbar>
      </DataTable>

      <CityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        city={selectedCity}
      />

      {deleteDialogOpen && cityToDelete && (
        <DeleteAlertDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          handleDelete={() => deleteMutation.mutate(cityToDelete.id)}
          isLoading={deleteMutation.isPending}
          title='locations.city.deleteTitle'
          description='locations.city.deleteDesc'
          translationValues={{ name: cityToDelete.name }}
        />
      )}
    </div>
  )
}
