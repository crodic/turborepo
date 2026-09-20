import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FolderPlus,
  LayoutGrid,
  List,
  MousePointer,
  PanelRight,
  PlusIcon,
} from 'lucide-react'
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
import { cn, normalizeDate, sortParser } from '@/lib/utils'
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
  FileBreadcrumbs,
  FileDropzoneOverlay,
  FileGridToolbar,
  FileGridView,
  FileInspector,
  FolderCardGrid,
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
  useInfiniteDataFileOverview,
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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('file-manager:view-mode')
      if (saved === 'grid' || saved === 'table') return saved
    }
    return 'grid'
  })
  const [localFolders, setLocalFolders] = useState<FolderSchema[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [droppedFiles, setDroppedFiles] = useState<File[]>([])
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [renameFolderOpen, setRenameFolderOpen] = useState(false)
  const [folderToRename, setFolderToRename] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<FileSchema | null>(null)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectedFile, setInspectedFile] = useState<FileSchema | null>(null)
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

  // Derive activeCategory from URL params so it persists across page reloads
  const activeCategory = useMemo(() => {
    const mime = typeof filter.mime === 'string' ? filter.mime : null
    const resourceType =
      typeof filter.resource_type === 'string' ? filter.resource_type : null
    if (mime === 'audio') return 'audio'
    if (resourceType) return resourceType
    return null
  }, [filter.mime, filter.resource_type])

  const isGridView = viewMode === 'grid'

  const params = builder.build()
  const { data: pagedData, isFetching: isPagedFetching } = useDataFileOverview(
    params,
    { enabled: !isGridView }
  )

  const infiniteParams = useMemo(
    () => ({
      ...params,
      limit: 24,
    }),
    [params]
  )

  const {
    data: infiniteData,
    isFetching: isInfiniteFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteDataFileOverview(infiniteParams, { enabled: isGridView })

  const { data: remoteFolders = [] } = useDataFileFolders()

  const allGridFiles = useMemo(
    () => infiniteData?.pages.flatMap((page) => page.data) ?? [],
    [infiniteData?.pages]
  )

  const currentFiles = isGridView ? allGridFiles : (pagedData?.data ?? [])
  const isFetching = isGridView ? isInfiniteFetching : isPagedFetching
  const totalItems = isGridView
    ? infiniteData?.pages[0]?.meta.totalItems
    : pagedData?.meta.totalItems

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
      if (inspectedFile?.public_id === deletingFile?.public_id) {
        setInspectedFile(null)
      }
      setDeletingFile(null)
    },
  })

  const deleteFolderMutation = useMutation({
    mutationFn: apiDeleteFolder,
    onSuccess: async () => {
      setLocalFolders((current) =>
        current.filter((folder) => folder.folder !== deletingFolder)
      )
      if (activeFolder === deletingFolder) {
        setActiveFolder(null)
      }
      setDeletingFolder(null)
      setDeleteFolderFiles(false)
      await invalidateFiles()
    },
    onError: (error) => restApiErrorHandler(error as never),
  })

  const handleInspectFile = useCallback((file: FileSchema) => {
    setInspectedFile(file)
    setInspectorOpen(true)
  }, [])

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
    data: currentFiles,
    columns,
    pageCount: pagedData?.meta.totalPages ?? 0,
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

  const handleCategorySelect = useCallback(
    (category: string | null) => {
      table.setPageIndex(0)
      void setPageQuery(1)

      if (!category || category === 'all') {
        void setFilterQuery((current) => ({
          ...current,
          [ColumnKey.resourceType]: null,
          [ColumnKey.mime]: null,
        }))
      } else if (category === 'audio') {
        void setFilterQuery((current) => ({
          ...current,
          [ColumnKey.resourceType]: null,
          [ColumnKey.mime]: 'audio',
        }))
      } else {
        void setFilterQuery((current) => ({
          ...current,
          [ColumnKey.resourceType]: category,
          [ColumnKey.mime]: null,
        }))
      }
    },
    [table, setPageQuery, setFilterQuery]
  )

  const handleViewModeChange = (mode: 'grid' | 'table') => {
    setViewMode(mode)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('file-manager:view-mode', mode)
    }
  }

  const handleDropFiles = useCallback((files: File[]) => {
    if (files.length > 0) {
      setDroppedFiles(files)
      setUploadOpen(true)
    }
  }, [])

  return (
    <>
      <FileDropzoneOverlay
        activeFolder={activeFolder}
        onDropFiles={handleDropFiles}
        disabled={!ability.can('create', 'FILE')}
      />

      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        {/* Top Header & Action Controls */}
        <div className='border-border/70 flex flex-wrap items-center justify-between gap-3 border-b pb-4'>
          <div className='flex flex-col gap-1'>
            <FileBreadcrumbs
              activeFolder={activeFolder}
              onSelectFolder={handleFolderSelect}
              itemCount={totalItems}
              isFetching={isFetching}
            />
            {pickedUrl && (
              <p className='text-muted-foreground mt-0.5 max-w-[min(720px,80vw)] truncate text-xs'>
                {t('files.picker.demoValue')}: {pickedUrl}
              </p>
            )}
          </div>

          <div className='flex items-center gap-2'>
            {/* View Mode Toggle */}
            <div className='border-border/80 bg-muted/40 flex items-center rounded-lg border p-0.5'>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size='icon'
                className='size-7 rounded-md'
                onClick={() => handleViewModeChange('grid')}
                title={t('files.view.grid')}
              >
                <LayoutGrid className='size-3.5' />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size='icon'
                className='size-7 rounded-md'
                onClick={() => handleViewModeChange('table')}
                title={t('files.view.table')}
              >
                <List className='size-3.5' />
              </Button>
            </div>

            {/* Inspector Toggle Button */}
            <Button
              variant={inspectorOpen ? 'secondary' : 'outline'}
              size='icon'
              className={cn(
                'size-8',
                inspectorOpen && 'border-primary/50 text-primary'
              )}
              onClick={() => setInspectorOpen((prev) => !prev)}
              title={t('files.inspector.title')}
            >
              <PanelRight className='size-4' />
            </Button>

            <Button
              variant='outline'
              size='sm'
              className='h-8 gap-1.5 text-xs'
              onClick={() => setPickerOpen(true)}
            >
              <MousePointer className='size-3.5' />
              <span className='hidden sm:inline'>
                {t('files.picker.demoButton')}
              </span>
            </Button>

            {ability.can('create', 'FILE') && (
              <>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 gap-1.5 text-xs'
                  onClick={() => setFolderDialogOpen(true)}
                >
                  <FolderPlus className='size-3.5' />
                  <span className='hidden sm:inline'>
                    {t('files.actions.createFolder')}
                  </span>
                </Button>
                <Button
                  size='sm'
                  className='h-8 gap-1.5 text-xs'
                  onClick={() => {
                    setDroppedFiles([])
                    setUploadOpen(true)
                  }}
                >
                  <PlusIcon className='size-3.5' />
                  <span>{t('files.actions.upload')}</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Main Body Layout */}
        <div className='grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]'>
          {/* Left Sidebar */}
          <FolderPanel
            folders={folders}
            activeFolder={activeFolder}
            activeCategory={activeCategory}
            totalFiles={totalItems ?? 0}
            onSelect={handleFolderSelect}
            onSelectCategory={handleCategorySelect}
            onCreateFolder={() => setFolderDialogOpen(true)}
            onRename={() => {
              setFolderToRename(activeFolder)
              setRenameFolderOpen(true)
            }}
            onDelete={() => setDeletingFolder(activeFolder)}
            canCreate={ability.can('create', 'FILE')}
            canUpdate={ability.can('update', 'FILE')}
            canDelete={ability.can('delete', 'FILE')}
          />

          {/* Right Workspace Content */}
          <div className='flex min-w-0 flex-1 flex-col gap-5'>
            {/* Quick Access Folders when at root */}
            {activeFolder === null && folders.length > 0 && (
              <FolderCardGrid
                folders={folders}
                activeFolder={activeFolder}
                onSelectFolder={handleFolderSelect}
                onRenameFolder={(folder) => {
                  setFolderToRename(folder)
                  setRenameFolderOpen(true)
                }}
                onDeleteFolder={(folder) => setDeletingFolder(folder)}
                canUpdate={ability.can('update', 'FILE')}
                canDelete={ability.can('delete', 'FILE')}
              />
            )}

            {/* Grid View Mode */}
            {viewMode === 'grid' ? (
              <div className='flex flex-col gap-4'>
                <FileGridToolbar
                  table={table}
                  activeCategory={activeCategory}
                  onSelectCategory={handleCategorySelect}
                />

                <FileGridView
                  files={currentFiles}
                  table={table}
                  isFetching={isFetching}
                  inspectedFile={inspectedFile}
                  onInspectFile={handleInspectFile}
                  onPreviewFile={setPreviewFile}
                  onCopyUrl={copyFileUrl}
                  onMoveFile={setMovingFile}
                  onDeleteFile={setDeletingFile}
                  canUpdate={ability.can('update', 'FILE')}
                  canDelete={ability.can('delete', 'FILE')}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  fetchNextPage={fetchNextPage}
                  totalItems={totalItems}
                />
              </div>
            ) : (
              /* Table View Mode */
              <DataTable
                table={table}
                onClickRowAction={handleInspectFile}
                isFetching={isFetching}
              >
                <DataTableToolbar table={table}>
                  <DataTableSortList table={table} />
                </DataTableToolbar>
              </DataTable>
            )}
          </div>
        </div>
      </Main>

      {/* Bulk Action Bar (Visible in both Grid and Table views when items are selected) */}
      <FilesTableActionBar
        table={table}
        onDelete={(files) => setBulkDeletingFiles(files)}
        disabled={ability.can('delete', 'FILE') === false}
      />

      {/* File Inspector Drawer */}
      <FileInspector
        open={inspectorOpen}
        onOpenChange={setInspectorOpen}
        file={inspectedFile}
        onPreview={setPreviewFile}
        onCopyUrl={copyFileUrl}
        onMove={setMovingFile}
        onDelete={setDeletingFile}
        canUpdate={ability.can('update', 'FILE')}
        canDelete={ability.can('delete', 'FILE')}
      />

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadOpen}
        folder={activeFolder}
        folders={folders}
        initialFiles={droppedFiles}
        onOpenChange={(open) => {
          setUploadOpen(open)
          if (!open) setDroppedFiles([])
        }}
        onUploaded={invalidateFiles}
        onCreateLocalFolder={(folder) => {
          handleFolderSelect(folder)
        }}
      />

      {/* Create Folder Dialog */}
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

      {/* Rename Folder Dialog */}
      <FolderDialog
        open={renameFolderOpen}
        title={t('files.folders.renameTitle')}
        submitLabel={t('buttons.save')}
        defaultValue={folderToRename ?? activeFolder ?? ''}
        onOpenChange={(open) => {
          setRenameFolderOpen(open)
          if (!open) setFolderToRename(null)
        }}
        onSubmit={async (folder) => {
          const target = folderToRename ?? activeFolder
          if (!target) return
          const renamed = await apiRenameFolder({
            folder: target,
            data: { folder },
          })
          handleFolderSelect(renamed.folder)
          setFolderToRename(null)
          await invalidateFiles()
        }}
      />

      {/* Move File Dialog */}
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
          if (inspectedFile?.public_id === movingFile.public_id) {
            setInspectedFile((prev) => (prev ? { ...prev, folder } : null))
          }
          setMovingFile(null)
          await invalidateFiles()
        }}
      />

      {/* Preview Dialog */}
      <PreviewDialog
        file={previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
      />

      {/* Demo File Picker Dialog */}
      <FilePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mode='url'
        value={pickedUrl}
        onValueChange={(value) => setPickedUrl(value)}
      />

      {/* Delete Single File Alert */}
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

      {/* Delete Bulk Files Alert */}
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

      {/* Delete Folder Alert */}
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
