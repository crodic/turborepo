import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FolderPlus, MousePointer, PlusIcon } from 'lucide-react'
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  useQueryState,
  useQueryStates,
} from 'nuqs'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { getSortingStateParser } from '@/lib/parsers'
import { PaginateQueryBuilder } from '@/lib/query-builder'
import { restApiErrorHandler } from '@/lib/rest-api-handler'
import { normalizeDate, sortParser } from '@/lib/utils'
import { useDataTable } from '@/hooks/use-data-table'
import useGetFilterParams from '@/hooks/use-get-filter-params'
import { Button } from '@/components/ui/button'
import { DeleteAlertDialog } from '@/components/common/delete-alert-dialog'
import { ConfigDrawer } from '@/components/config-drawer'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableSortList } from '@/components/data-table/data-table-sort-list'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { getFilesTableColumns } from './columns'
import {
  DeleteFolderDialog,
  FolderDialog,
  FolderPanel,
  MoveFileDialog,
  PreviewDialog,
  UploadDialog,
} from './components'
import { FilePickerDialog } from './file-picker-dialog'
import { FilesTableActionBar } from './file-table-action-bar'
import {
  apiCreateFolder,
  apiDeleteFile,
  apiDeleteFiles,
  apiDeleteFolder,
  apiRenameFolder,
  apiUpdateFile,
  fileQueryKeys,
  useDataFileFolders,
  useDataFileOverview,
} from './queries'
import { ColumnKey, type FileSchema, type FolderSchema } from './schema'

const fileFilterParsers = {
  [ColumnKey.originalName]: parseAsString,
  [ColumnKey.folder]: parseAsString,
  [ColumnKey.resourceType]: parseAsString,
  [ColumnKey.mime]: parseAsString,
  [ColumnKey.status]: parseAsString,
  [ColumnKey.createdAt]: parseAsArrayOf(parseAsInteger, ','),
} as const

const fileAllowedSorts = [
  ColumnKey.originalName,
  ColumnKey.folder,
  ColumnKey.resourceType,
  ColumnKey.mime,
  ColumnKey.status,
  ColumnKey.size,
  ColumnKey.createdAt,
]

async function copyFileUrl(file: FileSchema) {
  await navigator.clipboard.writeText(file.url)
}

export function PageFileOverview() {
  const { t } = useTranslation()
  const { ability } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [localFolders, setLocalFolders] = useState<FolderSchema[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [renameFolderOpen, setRenameFolderOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileSchema | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickedUrl, setPickedUrl] = useState<string | null>(null)
  const [movingFile, setMovingFile] = useState<FileSchema | null>(null)
  const [deletingFile, setDeletingFile] = useState<FileSchema | null>(null)
  const [bulkDeletingFiles, setBulkDeletingFiles] = useState<FileSchema[]>([])
  const [deletingFolder, setDeletingFolder] = useState<string | null>(null)
  const [deleteFolderFiles, setDeleteFolderFiles] = useState(false)
  const [, setPageQuery] = useQueryState('page', parseAsInteger.withDefault(1))
  const [, setSearchQuery] = useQueryState(
    'search',
    parseAsString.withDefault('')
  )
  const [, setSortQuery] = useQueryState(
    'sort',
    getSortingStateParser<FileSchema>(fileAllowedSorts).withDefault([])
  )
  const [, setFilterQuery] = useQueryStates(fileFilterParsers)

  const {
    page,
    perPage,
    sorting: sort,
    filter,
    search,
  } = useGetFilterParams<FileSchema, typeof fileFilterParsers>({
    allowedSorts: fileAllowedSorts,
    filterParsers: fileFilterParsers,
  })

  const createdFrom = normalizeDate(filter.createdAt?.[0])
  const createdTo = normalizeDate(filter.createdAt?.[1])

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('original_name', filter.original_name)
    .ilike('folder', filter.folder)
    .ilike('mime', filter.mime)
    .eq('resource_type', filter.resource_type)
    .eq('status', filter.status)
    .btw('createdAt', createdFrom, createdTo)
    .applySorts(sortParser(sort))
    .search(search)

  if (activeFolder) {
    builder.eq('folder', activeFolder)
  }

  const params = builder.build()
  const { data, isFetching } = useDataFileOverview(params)
  const { data: remoteFolders = [] } = useDataFileFolders()

  const folders = useMemo(() => {
    const map = new Map<string, FolderSchema>()
    for (const folder of [...localFolders, ...remoteFolders]) {
      map.set(folder.folder, folder)
    }
    return Array.from(map.values()).sort((a, b) =>
      a.folder.localeCompare(b.folder)
    )
  }, [localFolders, remoteFolders])

  const invalidateFiles = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: fileQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: fileQueryKeys.folders }),
    ])
  }

  const deleteFileMutation = useMutation({
    mutationFn: apiDeleteFile,
    onSuccess: async () => {
      await invalidateFiles()
      setDeletingFile(null)
    },
  })

  const deleteFolderMutation = useMutation({
    mutationFn: apiDeleteFolder,
    onSuccess: async () => {
      setLocalFolders((current) =>
        current.filter((folder) => folder.folder !== deletingFolder)
      )
      setActiveFolder(null)
      setDeletingFolder(null)
      setDeleteFolderFiles(false)
      await invalidateFiles()
    },
    onError: (error) => restApiErrorHandler(error as never),
  })

  const columns = useMemo(
    () =>
      getFilesTableColumns({
        onPreview: setPreviewFile,
        onCopyUrl: copyFileUrl,
        onMove: setMovingFile,
        onDelete: setDeletingFile,
        canUpdate: ability.can('update', 'FILE'),
        canDelete: ability.can('delete', 'FILE'),
      }),
    [ability]
  )

  const { table } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: data?.meta.totalPages ?? 0,
    initialState: {
      columnPinning: { left: ['select'], right: ['actions'] },
    },
    getRowId: (row) => row.public_id,
  })

  const bulkDeleteFileMutation = useMutation({
    mutationFn: (files: FileSchema[]) =>
      apiDeleteFiles(files.map((file) => file.public_id)),
    onSuccess: async (_, files) => {
      table.resetRowSelection()
      setBulkDeletingFiles([])
      await invalidateFiles()
      toast.success(t('files.delete.bulkSuccess', { count: files.length }))
    },
    onError: (error) => restApiErrorHandler(error as never),
  })

  const handleFolderSelect = useCallback(
    (folder: string | null) => {
      if (folder === activeFolder) return

      setActiveFolder(folder)
      table.setPageIndex(0)
      table.resetColumnFilters()
      table.resetSorting()
      table.resetRowSelection()
      void setPageQuery(1)
      void setSearchQuery(null)
      void setSortQuery(null)
      void setFilterQuery({
        [ColumnKey.originalName]: null,
        [ColumnKey.folder]: null,
        [ColumnKey.resourceType]: null,
        [ColumnKey.mime]: null,
        [ColumnKey.status]: null,
        [ColumnKey.createdAt]: null,
      })
    },
    [
      activeFolder,
      table,
      setPageQuery,
      setSearchQuery,
      setSortQuery,
      setFilterQuery,
    ]
  )

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
              {t('files.overview.title')}
            </h2>
            <p className='text-muted-foreground'>
              {t('files.overview.description')}
            </p>
            {pickedUrl && (
              <p className='text-muted-foreground mt-1 max-w-[min(720px,80vw)] truncate text-xs'>
                {t('files.picker.demoValue')}: {pickedUrl}
              </p>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline' onClick={() => setPickerOpen(true)}>
              <MousePointer className='size-4' />
              {t('files.picker.demoButton')}
            </Button>
            {ability.can('create', 'FILE') && (
              <>
                <Button
                  variant='outline'
                  onClick={() => setFolderDialogOpen(true)}
                >
                  <FolderPlus className='size-4' />
                  {t('files.actions.createFolder')}
                </Button>
                <Button onClick={() => setUploadOpen(true)}>
                  <PlusIcon className='size-4' />
                  {t('files.actions.upload')}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className='grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]'>
          <FolderPanel
            folders={folders}
            activeFolder={activeFolder}
            totalFiles={data?.meta.totalItems ?? 0}
            onSelect={handleFolderSelect}
            onRename={() => setRenameFolderOpen(true)}
            onDelete={() => setDeletingFolder(activeFolder)}
            canUpdate={ability.can('update', 'FILE')}
            canDelete={ability.can('delete', 'FILE')}
          />

          <DataTable
            table={table}
            onClickRowAction={setPreviewFile}
            isFetching={isFetching}
            actionBar={
              <FilesTableActionBar
                table={table}
                onDelete={(files) => setBulkDeletingFiles(files)}
                disabled={ability.can('delete', 'FILE') === false}
              />
            }
          >
            <DataTableToolbar table={table}>
              <DataTableSortList table={table} />
            </DataTableToolbar>
          </DataTable>
        </div>
      </Main>

      <UploadDialog
        open={uploadOpen}
        folder={activeFolder}
        folders={folders}
        onOpenChange={setUploadOpen}
        onUploaded={invalidateFiles}
        onCreateLocalFolder={(folder) => {
          handleFolderSelect(folder)
        }}
      />

      <FolderDialog
        open={folderDialogOpen}
        title={t('files.folders.createTitle')}
        submitLabel={t('files.actions.createFolder')}
        onOpenChange={setFolderDialogOpen}
        onSubmit={async (folder) => {
          const created = await apiCreateFolder({ folder })
          setLocalFolders((current) => [
            ...current.filter((item) => item.folder !== created.folder),
            created,
          ])
          handleFolderSelect(created.folder)
        }}
      />

      <FolderDialog
        open={renameFolderOpen}
        title={t('files.folders.renameTitle')}
        submitLabel={t('buttons.save')}
        defaultValue={activeFolder ?? ''}
        onOpenChange={setRenameFolderOpen}
        onSubmit={async (folder) => {
          if (!activeFolder) return
          const renamed = await apiRenameFolder({
            folder: activeFolder,
            data: { folder },
          })
          handleFolderSelect(renamed.folder)
          await invalidateFiles()
        }}
      />

      <MoveFileDialog
        file={movingFile}
        folders={folders}
        onOpenChange={(open) => !open && setMovingFile(null)}
        onMoved={async (folder) => {
          if (!movingFile) return
          await apiUpdateFile({
            publicId: movingFile.public_id,
            data: { folder },
          })
          setMovingFile(null)
          await invalidateFiles()
        }}
      />

      <PreviewDialog
        file={previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
      />

      <FilePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mode='url'
        value={pickedUrl}
        onValueChange={(value) => setPickedUrl(value)}
      />

      {deletingFile && (
        <DeleteAlertDialog
          open={Boolean(deletingFile)}
          onOpenChange={(open) => !open && setDeletingFile(null)}
          handleDelete={() => deleteFileMutation.mutate(deletingFile.public_id)}
          isLoading={deleteFileMutation.isPending}
          title='files.delete.title'
          description='files.delete.description'
        />
      )}

      {bulkDeletingFiles.length > 0 && (
        <DeleteAlertDialog
          open={bulkDeletingFiles.length > 0}
          onOpenChange={(open) => !open && setBulkDeletingFiles([])}
          handleDelete={() => bulkDeleteFileMutation.mutate(bulkDeletingFiles)}
          isLoading={bulkDeleteFileMutation.isPending}
          title='files.delete.bulkTitle'
          description='files.delete.bulkDescription'
          translationValues={{ count: String(bulkDeletingFiles.length) }}
        />
      )}

      <DeleteFolderDialog
        folder={deletingFolder}
        deleteFiles={deleteFolderFiles}
        isLoading={deleteFolderMutation.isPending}
        onDeleteFilesChange={setDeleteFolderFiles}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingFolder(null)
            setDeleteFolderFiles(false)
          }
        }}
        onConfirm={() => {
          if (!deletingFolder) return
          deleteFolderMutation.mutate({
            folder: deletingFolder,
            deleteFiles: deleteFolderFiles,
          })
        }}
      />
    </>
  )
}
