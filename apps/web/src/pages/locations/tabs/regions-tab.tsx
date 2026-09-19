import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon } from 'lucide-react'
import { parseAsString } from 'nuqs'
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
import { getRegionsTableColumns } from '../columns/regions-columns'
import { RegionDialog } from '../dialogs/region-dialog'
import { apiDeleteRegion, useRegionsQuery } from '../queries'
import { RegionColumnKey, type RegionSchema } from '../schema'

const regionFilterParsers = {
  [RegionColumnKey.name]: parseAsString,
} as const

export function RegionsTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<RegionSchema | null>(
    null
  )

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [regionToDelete, setRegionToDelete] = useState<RegionSchema | null>(
    null
  )

  const {
    page,
    perPage,
    sorting: sort,
    filter,
    search,
  } = useGetFilterParams<RegionSchema, typeof regionFilterParsers>({
    allowedSorts: [RegionColumnKey.name, RegionColumnKey.createdAt],
    filterParsers: regionFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('name', filter.name)
    .applySorts(sortParser(sort))
    .search(search)

  const { data, isFetching } = useRegionsQuery(builder.build())

  const handleEdit = useCallback((region: RegionSchema) => {
    setSelectedRegion(region)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback((region: RegionSchema) => {
    setRegionToDelete(region)
    setDeleteDialogOpen(true)
  }, [])

  const columns = useMemo(
    () =>
      getRegionsTableColumns({
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
    mutationFn: (id: string) => apiDeleteRegion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] })
      queryClient.invalidateQueries({ queryKey: ['public-regions'] })
      toast.success(
        t('locations.region.deleted', 'Region deleted successfully')
      )
      setDeleteDialogOpen(false)
      setRegionToDelete(null)
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
              setSelectedRegion(null)
              setDialogOpen(true)
            }}
          >
            <PlusIcon className='mr-1 size-4' />
            {t('locations.region.createBtn', 'Add Region')}
          </Button>
          <DataTableSortList table={table} />
        </DataTableToolbar>
      </DataTable>

      <RegionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        region={selectedRegion}
      />

      {deleteDialogOpen && regionToDelete && (
        <DeleteAlertDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          handleDelete={() => deleteMutation.mutate(regionToDelete.id)}
          isLoading={deleteMutation.isPending}
          title='locations.region.deleteTitle'
          description='locations.region.deleteDesc'
          translationValues={{ name: regionToDelete.name }}
        />
      )}
    </div>
  )
}
