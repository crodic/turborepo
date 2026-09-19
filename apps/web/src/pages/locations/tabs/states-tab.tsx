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
import { getStatesTableColumns } from '../columns/states-columns'
import { StateDialog } from '../dialogs/state-dialog'
import { apiDeleteState, useStatesQuery } from '../queries'
import { StateColumnKey, type StateSchema } from '../schema'

const stateFilterParsers = {
  [StateColumnKey.name]: parseAsString,
  [StateColumnKey.countryCode]: parseAsArrayOf(parseAsString, ','),
  [StateColumnKey.iso2]: parseAsString,
} as const

export function StatesTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedState, setSelectedState] = useState<StateSchema | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [stateToDelete, setStateToDelete] = useState<StateSchema | null>(null)

  const {
    page,
    perPage,
    sorting: sort,
    filter,
    search,
  } = useGetFilterParams<StateSchema, typeof stateFilterParsers>({
    allowedSorts: [
      StateColumnKey.name,
      StateColumnKey.countryCode,
      StateColumnKey.iso2,
      StateColumnKey.type,
      StateColumnKey.createdAt,
    ],
    filterParsers: stateFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('name', filter.name)
    .in('countryCode', filter.countryCode || [])
    .ilike('iso2', filter.iso2)
    .applySorts(sortParser(sort))
    .search(search)

  const { data, isFetching } = useStatesQuery(builder.build())

  const handleEdit = useCallback((state: StateSchema) => {
    setSelectedState(state)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback((state: StateSchema) => {
    setStateToDelete(state)
    setDeleteDialogOpen(true)
  }, [])

  const columns = useMemo(
    () =>
      getStatesTableColumns({
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
    mutationFn: (id: string) => apiDeleteState(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['states'] })
      queryClient.invalidateQueries({ queryKey: ['public-states'] })
      toast.success(
        t('locations.state.deleted', 'State / Province deleted successfully')
      )
      setDeleteDialogOpen(false)
      setStateToDelete(null)
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
              setSelectedState(null)
              setDialogOpen(true)
            }}
          >
            <PlusIcon className='mr-1 size-4' />
            {t('locations.state.createBtn', 'Add State')}
          </Button>
          <DataTableSortList table={table} />
        </DataTableToolbar>
      </DataTable>

      <StateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        state={selectedState}
      />

      {deleteDialogOpen && stateToDelete && (
        <DeleteAlertDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          handleDelete={() => deleteMutation.mutate(stateToDelete.id)}
          isLoading={deleteMutation.isPending}
          title='locations.state.deleteTitle'
          description='locations.state.deleteDesc'
          translationValues={{ name: stateToDelete.name }}
        />
      )}
    </div>
  )
}
