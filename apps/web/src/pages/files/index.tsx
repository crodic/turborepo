import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AxiosError } from 'axios'
import { format } from 'date-fns'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileIcon,
  Folder,
  FolderPlus,
  LinkIcon,
  Loader2,
  Pencil,
  PlusIcon,
  MousePointer,
  Trash2,
  Upload,
  Video,
  X,
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
import { normalizeDate, sortParser } from '@/lib/utils'
import { useDataTable } from '@/hooks/use-data-table'
import useGetFilterParams from '@/hooks/use-get-filter-params'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DeleteAlertDialog } from '@/components/common/delete-alert-dialog'
import { ConfigDrawer } from '@/components/config-drawer'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableSortList } from '@/components/data-table/data-table-sort-list'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import AutoCompleteSelect, {
  type Option,
} from '@/components/forms/auto-complete-select'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { formatBytes, getFilesTableColumns } from './columns'
import { FilePickerDialog } from './file-picker-dialog'
import { FilePreviewDetail, isPreviewableImage } from './file-preview'
import { FilesTableActionBar } from './file-table-action-bar'
import {
  apiCreateFolder,
  apiDeleteFile,
  apiDeleteFiles,
  apiDeleteFolder,
  apiRenameFolder,
  apiUpdateFile,
  apiUploadFile,
  fileQueryKeys,
  MANAGED_FILE_UPLOAD_MAX_SIZE,
  useDataFileFolders,
  useDataFileOverview,
} from './queries'
import {
  ColumnKey,
  isValidFolderName,
  type FileSchema,
  type FolderSchema,
} from './schema'

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
    .sortBy(sortParser(sort).sortBy, sortParser(sort).sortDirection)
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

function FolderPanel({
  folders,
  activeFolder,
  totalFiles,
  onSelect,
  onRename,
  onDelete,
  canUpdate,
  canDelete,
}: {
  folders: FolderSchema[]
  activeFolder: string | null
  totalFiles: number
  onSelect: (folder: string | null) => void
  onRename: () => void
  onDelete: () => void
  canUpdate: boolean
  canDelete: boolean
}) {
  const { t } = useTranslation()
  const selectedFolder = folders.find(
    (folder) => folder.folder === activeFolder
  )

  return (
    <aside className='border-border flex h-fit flex-col gap-3 rounded-md border p-3'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-medium'>{t('files.folders.title')}</h3>
        <Badge variant='secondary'>{folders.length}</Badge>
      </div>
      <Button
        variant={activeFolder === null ? 'secondary' : 'ghost'}
        className='h-auto justify-start gap-2 px-2 py-2'
        onClick={() => onSelect(null)}
      >
        <Folder className='size-4' />
        <span className='min-w-0 flex-1 truncate text-left'>
          {t('files.folders.all')}
        </span>
        <span className='text-muted-foreground text-xs'>{totalFiles}</span>
      </Button>
      <div className='flex max-h-[420px] flex-col gap-1 overflow-auto'>
        {folders.map((folder) => (
          <Button
            key={folder.folder}
            variant={activeFolder === folder.folder ? 'secondary' : 'ghost'}
            className='h-auto justify-start gap-2 px-2 py-2'
            onClick={() => onSelect(folder.folder)}
          >
            <Folder className='size-4' />
            <span className='min-w-0 flex-1 truncate text-left'>
              {folder.folder}
            </span>
            <span className='text-muted-foreground text-xs'>
              {folder.count}
            </span>
          </Button>
        ))}
      </div>
      {selectedFolder && (
        <div className='border-border flex flex-col gap-2 border-t pt-3'>
          <div className='text-muted-foreground flex items-center justify-between text-xs'>
            <span>{formatBytes(selectedFolder.size)}</span>
            <span>{selectedFolder.count} files</span>
          </div>
          <div className='flex gap-2'>
            {canUpdate && (
              <Button
                variant='outline'
                size='sm'
                className='flex-1'
                onClick={onRename}
              >
                <Pencil className='size-4' />
                {t('buttons.edit')}
              </Button>
            )}
            {canDelete && (
              <Button
                variant='outline'
                size='sm'
                className='flex-1'
                onClick={onDelete}
              >
                <Trash2 className='size-4' />
                {t('buttons.delete')}
              </Button>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}

function UploadDialog({
  open,
  folder,
  folders,
  onOpenChange,
  onUploaded,
  onCreateLocalFolder,
}: {
  open: boolean
  folder: string | null
  folders: FolderSchema[]
  onOpenChange: (open: boolean) => void
  onUploaded: () => Promise<void>
  onCreateLocalFolder: (folder: string) => void
}) {
  const { t } = useTranslation()
  const [targetFolder, setTargetFolder] = useState(folder ?? '')
  const [targetDisk, setTargetDisk] = useState<'local' | 'public'>('public')
  const [files, setFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  )

  const uploadMutation = useMutation({
    mutationFn: async () => {
      for (const file of files) {
        if (file.size > MANAGED_FILE_UPLOAD_MAX_SIZE) {
          throw new Error(
            t('files.upload.sizeLimitError', {
              name: file.name,
              size: formatBytes(MANAGED_FILE_UPLOAD_MAX_SIZE),
            })
          )
        }

        const fileKey = getLocalUploadKey(file)
        await apiUploadFile({
          file,
          folder: targetFolder || null,
          disk: targetDisk,
          onProgress: (progress) =>
            setUploadProgress((current) => ({
              ...current,
              [fileKey]: progress,
            })),
        })
      }
    },
    onSuccess: async () => {
      if (targetFolder) onCreateLocalFolder(targetFolder)
      setFiles([])
      setUploadProgress({})
      onOpenChange(false)
      await onUploaded()
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        restApiErrorHandler(error)
        return
      }

      toast.error(
        error instanceof Error ? error.message : t('files.upload.failed')
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('files.upload.title')}</DialogTitle>
          <DialogDescription>{t('files.upload.description')}</DialogDescription>
        </DialogHeader>
        <div className='grid gap-4'>
          <div className='grid gap-2'>
            <Label>{t('files.upload.disk')}</Label>
            <Select
              value={targetDisk}
              onValueChange={(value) =>
                setTargetDisk(value as 'local' | 'public')
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='public'>
                  {t('files.upload.diskPublic')}
                </SelectItem>
                <SelectItem value='local'>
                  {t('files.upload.diskLocal')}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className='text-muted-foreground text-xs'>
              {targetDisk === 'local'
                ? t('files.upload.diskLocalHelp')
                : t('files.upload.diskPublicHelp')}
            </p>
          </div>
          <FolderCreatableField
            label={t('files.table.folder')}
            value={targetFolder}
            folders={folders}
            onChange={setTargetFolder}
          />
          <label className='border-border hover:bg-muted/40 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-8 text-center'>
            <Upload className='text-muted-foreground size-8' />
            <span className='font-medium'>{t('files.upload.pickFiles')}</span>
            <span className='text-muted-foreground text-sm'>
              {files.length > 0
                ? t('files.upload.selected', { count: files.length })
                : t('files.upload.empty')}
            </span>
            <Input
              type='file'
              multiple
              className='sr-only'
              onChange={(event) =>
                setFiles((current) => [
                  ...current,
                  ...Array.from(event.target.files ?? []),
                ])
              }
            />
          </label>
          {files.length > 0 && (
            <ScrollArea className='max-h-64 rounded-md border'>
              <div className='grid gap-2 p-2'>
                {files.map((file, index) => (
                  <UploadFilePreview
                    key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                    file={file}
                    progress={uploadProgress[getLocalUploadKey(file)]}
                    uploading={uploadMutation.isPending}
                    onRemove={() =>
                      setFiles((current) =>
                        current.filter(
                          (_, currentIndex) => currentIndex !== index
                        )
                      )
                    }
                  />
                ))}
              </div>
            </ScrollArea>
          )}
          {uploadMutation.error instanceof AxiosError && (
            <p className='text-destructive text-sm'>
              {uploadMutation.error.response?.data.message ??
                uploadMutation.error.message}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={uploadMutation.isPending}
          >
            {t('buttons.cancel')}
          </Button>
          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={files.length === 0 || uploadMutation.isPending}
          >
            {uploadMutation.isPending && (
              <Loader2 className='size-4 animate-spin' />
            )}
            {t('files.actions.upload')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function UploadFilePreview({
  file,
  progress,
  uploading,
  onRemove,
}: {
  file: File
  progress?: number
  uploading: boolean
  onRemove: () => void
}) {
  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!isImage && !isVideo) {
      setPreviewUrl(null)
      return
    }

    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    return () => URL.revokeObjectURL(url)
  }, [file, isImage, isVideo])

  return (
    <div className='border-border flex min-w-0 items-center gap-3 rounded-md border p-3'>
      <div className='bg-muted flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border'>
        {previewUrl && isVideo ? (
          <video
            src={previewUrl}
            className='size-full object-cover'
            muted
            playsInline
            preload='metadata'
          />
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt={file.name}
            className='size-full object-cover'
          />
        ) : isVideo ? (
          <Video className='text-muted-foreground size-5' />
        ) : (
          <FileIcon className='text-muted-foreground size-5' />
        )}
      </div>
      <div className='min-w-0 flex-1'>
        <p className='truncate text-sm font-medium'>{file.name}</p>
        <p className='text-muted-foreground text-xs'>
          {formatBytes(file.size)}
          {uploading && progress != null ? ` - ${progress}%` : ''}
        </p>
      </div>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='shrink-0'
        onClick={onRemove}
        disabled={uploading}
      >
        <X className='size-4' />
      </Button>
    </div>
  )
}

function getLocalUploadKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function FolderDialog({
  open,
  title,
  submitLabel,
  defaultValue = '',
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  title: string
  submitLabel: string
  defaultValue?: string
  onOpenChange: (open: boolean) => void
  onSubmit: (folder: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const [folder, setFolder] = useState(defaultValue)
  const normalizedFolder = folder.trim()
  const folderError =
    normalizedFolder && !isValidFolderName(normalizedFolder)
      ? t('files.folders.invalidName')
      : null
  const mutation = useMutation({
    mutationFn: () => onSubmit(normalizedFolder),
    onSuccess: () => {
      setFolder('')
      onOpenChange(false)
    },
  })

  useEffect(() => {
    setFolder(defaultValue)
  }, [defaultValue, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className='grid gap-2'>
          <Label htmlFor='folder-name'>{t('files.table.folder')}</Label>
          <Input
            id='folder-name'
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
          />
          {folderError && (
            <p className='text-destructive text-sm'>{folderError}</p>
          )}
          {mutation.error instanceof AxiosError && (
            <p className='text-destructive text-sm'>
              {mutation.error.response?.data.message ?? mutation.error.message}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('buttons.cancel')}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={
              !normalizedFolder || Boolean(folderError) || mutation.isPending
            }
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MoveFileDialog({
  file,
  folders,
  onOpenChange,
  onMoved,
}: {
  file: FileSchema | null
  folders: FolderSchema[]
  onOpenChange: (open: boolean) => void
  onMoved: (folder: string | null) => Promise<void>
}) {
  const { t } = useTranslation()
  const [folder, setFolder] = useState(file?.folder ?? '')
  const mutation = useMutation({
    mutationFn: () => onMoved(folder.trim() || null),
  })

  useEffect(() => {
    setFolder(file?.folder ?? '')
  }, [file])

  return (
    <Dialog open={Boolean(file)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('files.move.title')}</DialogTitle>
          <DialogDescription>{file?.original_name}</DialogDescription>
        </DialogHeader>
        <FolderCreatableField
          label={t('files.table.folder')}
          value={folder}
          folders={folders}
          onChange={setFolder}
        />
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('buttons.cancel')}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {t('buttons.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PreviewDialog({
  file,
  onOpenChange,
}: {
  file: FileSchema | null
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const openUrl = file?.url
  const [transform, setTransform] = useState({
    width: '',
    height: '',
    crop: '',
    format: '',
    quality: '',
    effect: '',
    raw: '',
  })
  const [transformations, setTransformations] = useState('')
  const transformedUrl =
    file && transformations
      ? buildFileTransformUrl(file.url, transformations)
      : null
  const previewUrl = transformedUrl ?? undefined
  const previewOpenUrl = transformedUrl ?? openUrl

  useEffect(() => {
    setTransform({
      width: '',
      height: '',
      crop: '',
      format: '',
      quality: '',
      effect: '',
      raw: '',
    })
    setTransformations('')
  }, [file?.public_id])

  const handleViewTransform = () => {
    const nextTransformations = buildImageTransformations(transform)

    if (!nextTransformations) {
      setTransformations('')
      return
    }

    setTransformations(nextTransformations)
  }

  return (
    <Dialog open={Boolean(file)} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-6xl'>
        <DialogHeader>
          <DialogTitle className='pr-6 break-words'>
            {file?.original_name}
          </DialogTitle>
          <DialogDescription className='break-all'>
            {file?.public_id}
          </DialogDescription>
        </DialogHeader>
        {file && (
          <div className='grid min-h-0 gap-4 overflow-y-auto pr-1 md:grid-cols-[minmax(0,1fr)_minmax(0,240px)]'>
            <div className='bg-muted flex min-h-[220px] min-w-0 items-center justify-center overflow-hidden rounded-md border'>
              <FilePreviewDetail file={file} url={previewUrl} />
            </div>
            <dl className='grid min-w-0 content-start gap-3 text-sm'>
              {isPreviewableImage(file) && (
                <ImageTransformPanel
                  value={transform}
                  activeTransformations={transformations}
                  onChange={setTransform}
                  onView={handleViewTransform}
                  onReset={() => setTransformations('')}
                />
              )}
              <Metadata label={t('files.table.folder')}>
                {file.folder ?? t('files.folders.root')}
              </Metadata>
              <Metadata label={t('files.table.mime')}>{file.mime}</Metadata>
              <Metadata label={t('files.table.size')}>
                {formatBytes(file.size)}
              </Metadata>
              <Metadata label={t('files.table.dimensions')}>
                {file.width && file.height
                  ? `${file.width} x ${file.height}`
                  : '-'}
              </Metadata>
              <Metadata label={t('files.table.status')}>{file.status}</Metadata>
              <Metadata label={t('files.table.createdAt')}>
                {format(file.createdAt, 'dd/MM/yyyy HH:mm')}
              </Metadata>
              <Button variant='outline' className='min-w-0' asChild>
                <a href={previewOpenUrl} target='_blank' rel='noreferrer'>
                  <LinkIcon className='size-4' />
                  <span className='truncate'>{t('files.actions.open')}</span>
                </a>
              </Button>
            </dl>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Metadata({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className='text-muted-foreground text-xs'>{label}</dt>
      <dd className='min-w-0 font-medium break-all'>{children}</dd>
    </div>
  )
}

type ImageTransformForm = {
  width: string
  height: string
  crop: string
  format: string
  quality: string
  effect: string
  raw: string
}

function ImageTransformPanel({
  value,
  activeTransformations,
  onChange,
  onView,
  onReset,
}: {
  value: ImageTransformForm
  activeTransformations: string
  onChange: (value: ImageTransformForm) => void
  onView: () => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const update = (key: keyof ImageTransformForm, nextValue: string) => {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <div className='grid gap-2 rounded-md border p-3'>
      <div>
        <p className='text-sm font-medium'>{t('files.transform.title')}</p>
        {activeTransformations && (
          <p className='text-muted-foreground mt-1 text-xs break-all'>
            {activeTransformations}
          </p>
        )}
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <Input
          type='number'
          min={1}
          value={value.width}
          onChange={(event) => update('width', event.target.value)}
          placeholder={t('files.transform.width')}
        />
        <Input
          type='number'
          min={1}
          value={value.height}
          onChange={(event) => update('height', event.target.value)}
          placeholder={t('files.transform.height')}
        />
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <TransformSelect
          value={value.crop}
          placeholder={t('files.transform.crop')}
          options={['fill', 'cover', 'fit', 'limit', 'pad', 'thumb']}
          onValueChange={(nextValue) => update('crop', nextValue)}
        />
        <TransformSelect
          value={value.format}
          placeholder={t('files.transform.format')}
          options={['jpg', 'png', 'webp']}
          onValueChange={(nextValue) => update('format', nextValue)}
        />
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <Input
          type='number'
          min={1}
          max={100}
          value={value.quality}
          onChange={(event) => update('quality', event.target.value)}
          placeholder={t('files.transform.quality')}
        />
        <TransformSelect
          value={value.effect}
          placeholder={t('files.transform.effect')}
          options={['grayscale', 'blur:8', 'sharpen:4']}
          onValueChange={(nextValue) => update('effect', nextValue)}
        />
      </div>
      <Input
        value={value.raw}
        onChange={(event) => update('raw', event.target.value)}
        placeholder={t('files.transform.raw')}
      />
      <div className='flex gap-2'>
        <Button size='sm' className='flex-1' onClick={onView}>
          {t('files.transform.view')}
        </Button>
        <Button size='sm' variant='outline' onClick={onReset}>
          {t('files.transform.reset')}
        </Button>
      </div>
    </div>
  )
}

function TransformSelect({
  value,
  placeholder,
  options,
  onValueChange,
}: {
  value: string
  placeholder: string
  options: string[]
  onValueChange: (value: string) => void
}) {
  return (
    <Select
      value={value || 'none'}
      onValueChange={(nextValue) =>
        onValueChange(nextValue === 'none' ? '' : nextValue)
      }
    >
      <SelectTrigger className='w-full'>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='none'>{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function buildImageTransformations(value: ImageTransformForm) {
  const parts = [
    toPositiveTransform('w', value.width),
    toPositiveTransform('h', value.height),
    value.crop ? `c_${value.crop}` : null,
    value.format ? `f_${value.format}` : null,
    toPositiveTransform('q', value.quality, 100),
    value.effect ? `e_${value.effect}` : null,
    value.raw.trim() || null,
  ].filter(Boolean)

  return parts.join(',')
}

function toPositiveTransform(prefix: string, value: string, max?: number) {
  const number = Number(value)

  if (!Number.isFinite(number) || number <= 0) return null

  return `${prefix}_${max ? Math.min(number, max) : number}`
}

function buildFileTransformUrl(url: string, transformations: string) {
  const [baseUrl] = url.split('?')
  const match = baseUrl.match(/^(.*\/storage\/uploads\/[^/]+)\/([^/]+)$/)

  if (!match) return url

  return `${match[1]}/${transformations}/${match[2]}`
}

function DeleteFolderDialog({
  folder,
  deleteFiles,
  isLoading,
  onDeleteFilesChange,
  onOpenChange,
  onConfirm,
}: {
  folder: string | null
  deleteFiles: boolean
  isLoading: boolean
  onDeleteFilesChange: (checked: boolean) => void
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const { t } = useTranslation()

  return (
    <Dialog open={Boolean(folder)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('files.folders.deleteTitle')}</DialogTitle>
          <DialogDescription>
            {t('files.folders.deleteDescription')}
          </DialogDescription>
        </DialogHeader>
        <label className='border-border flex cursor-pointer items-start gap-3 rounded-md border p-3'>
          <Checkbox
            checked={deleteFiles}
            onCheckedChange={(checked) => onDeleteFilesChange(checked === true)}
          />
          <span className='grid gap-1 text-sm'>
            <span className='font-medium'>
              {t('files.folders.deleteFilesLabel')}
            </span>
            <span className='text-muted-foreground'>
              {t('files.folders.deleteFilesDescription')}
            </span>
          </span>
        </label>
        <DialogFooter>
          <Button
            variant='outline'
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
          >
            {t('buttons.cancel')}
          </Button>
          <Button
            variant='destructive'
            disabled={isLoading}
            onClick={onConfirm}
          >
            {t('buttons.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FolderCreatableField({
  label,
  value,
  folders,
  onChange,
}: {
  label: string
  value: string
  folders: FolderSchema[]
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState('')
  const options = useMemo<Option[]>(() => {
    const baseOptions = folders.map((folder) => ({
      id: folder.folder,
      name: folder.folder,
    }))
    const normalizedInput = inputValue.trim()
    const exists = baseOptions.some(
      (option) => option.name.toLowerCase() === normalizedInput.toLowerCase()
    )

    if (!normalizedInput || exists || !isValidFolderName(normalizedInput)) {
      return baseOptions
    }

    return [
      ...baseOptions,
      {
        id: normalizedInput,
        name: t('files.folders.createOption', { folder: normalizedInput }),
      },
    ]
  }, [folders, inputValue, t])
  const selected = value ? { id: value, name: value } : null

  return (
    <div className='grid gap-2'>
      <Label>{label}</Label>
      <AutoCompleteSelect
        isClearable
        options={options}
        value={selected}
        placeholder={t('files.folders.selectPlaceholder')}
        inputValue={inputValue}
        onInputChange={(newValue, actionMeta) => {
          if (actionMeta.action === 'input-change') {
            setInputValue(newValue)
          }
        }}
        noOptionsMessage={() =>
          inputValue.trim() && !isValidFolderName(inputValue.trim())
            ? t('files.folders.invalidName')
            : t('files.folders.noOptions')
        }
        onChange={(option) => {
          if (Array.isArray(option)) {
            const nextValue = option[0] ? String(option[0].id) : ''
            onChange(nextValue && isValidFolderName(nextValue) ? nextValue : '')
            setInputValue('')
            return
          }

          const selectedOption = option as Option | null
          const nextValue = selectedOption ? String(selectedOption.id) : ''
          onChange(nextValue && isValidFolderName(nextValue) ? nextValue : '')
          setInputValue('')
        }}
      />
    </div>
  )
}

async function copyFileUrl(file: FileSchema) {
  await navigator.clipboard.writeText(file.url)
}
