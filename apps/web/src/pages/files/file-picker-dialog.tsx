import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AxiosError } from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Folder,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  SearchIcon,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PaginateQueryBuilder } from '@/lib/query-builder'
import { restApiErrorHandler } from '@/lib/rest-api-handler'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatBytes } from './columns'
import { FilePreviewThumbnail } from './file-preview'
import {
  apiCreateFolder,
  apiUploadFile,
  fileQueryKeys,
  useDataFileFolders,
  useInfiniteDataFileOverview,
} from './queries'
import type { FileSchema, FolderSchema } from './schema'

export type AcceptSpec = {
  acceptString: string
  label: string
  primaryResourceType?: 'image' | 'video' | 'audio' | 'document'
  isMatch: (file: { mime?: string | null; original_name?: string }) => boolean
}

export function parseAcceptSpec(accept?: string | string[]): AcceptSpec | null {
  if (!accept) return null

  const items = (Array.isArray(accept) ? accept : accept.split(','))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  if (items.length === 0) return null

  const acceptString = items.join(',')

  const isAllImages = items.every(
    (item) =>
      item === 'image/*' ||
      item.startsWith('image/') ||
      ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.ico'].some(
        (ext) => item.endsWith(ext)
      )
  )
  const isAllVideos = items.every(
    (item) =>
      item === 'video/*' ||
      item.startsWith('video/') ||
      ['.mp4', '.webm', '.ogg', '.mov', '.mkv'].some((ext) =>
        item.endsWith(ext)
      )
  )
  const isAllAudio = items.every(
    (item) =>
      item === 'audio/*' ||
      item.startsWith('audio/') ||
      ['.mp3', '.wav', '.ogg', '.m4a', '.flac'].some((ext) =>
        item.endsWith(ext)
      )
  )
  const isAllDocs = items.every(
    (item) =>
      item === 'application/pdf' ||
      [
        '.pdf',
        '.doc',
        '.docx',
        '.xls',
        '.xlsx',
        '.ppt',
        '.pptx',
        '.txt',
        '.csv',
      ].some((ext) => item.endsWith(ext))
  )

  let primaryResourceType:
    | 'image'
    | 'video'
    | 'audio'
    | 'document'
    | undefined = undefined
  let label = acceptString

  if (isAllImages) {
    primaryResourceType = 'image'
    label = 'Images'
  } else if (isAllVideos) {
    primaryResourceType = 'video'
    label = 'Videos'
  } else if (isAllAudio) {
    primaryResourceType = 'audio'
    label = 'Audio'
  } else if (isAllDocs) {
    primaryResourceType = 'document'
    label = 'Documents'
  }

  const isMatch = (file: { mime?: string | null; original_name?: string }) => {
    const fileMime = (file.mime ?? '').toLowerCase()
    const fileName = (file.original_name ?? '').toLowerCase()

    return items.some((pattern) => {
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -2)
        return fileMime.startsWith(`${prefix}/`)
      }
      if (pattern.startsWith('.')) {
        return fileName.endsWith(pattern)
      }
      if (pattern.includes('/')) {
        return fileMime === pattern
      }
      return fileName.endsWith(`.${pattern}`)
    })
  }

  return {
    acceptString,
    label,
    primaryResourceType,
    isMatch,
  }
}

type FilePickerBaseProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  resourceType?: string
  accept?: string | string[]
  multiple?: boolean
}

export type FilePickerDialogProps =
  | (FilePickerBaseProps & {
      mode: 'file'
      multiple?: false
      value?: FileSchema | null
      onValueChange: (value: FileSchema | null) => void
    })
  | (FilePickerBaseProps & {
      mode: 'file'
      multiple: true
      value?: FileSchema[]
      onValueChange: (value: FileSchema[]) => void
    })
  | (FilePickerBaseProps & {
      mode: 'url'
      multiple?: false
      value?: string | null
      onValueChange: (value: string | null, file?: FileSchema) => void
    })
  | (FilePickerBaseProps & {
      mode: 'url'
      multiple: true
      value?: string[]
      onValueChange: (value: string[], files: FileSchema[]) => void
    })

export function FilePickerDialog(props: FilePickerDialogProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const multiple = props.multiple === true

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [targetUploadFolder, setTargetUploadFolder] =
    useState<string>('__root__')
  const [selectedFiles, setSelectedFiles] = useState<FileSchema[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const dragCounterRef = useRef(0)

  // Parse accept specification
  const acceptSpec = useMemo(
    () => parseAcceptSpec(props.accept),
    [props.accept]
  )

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Reset or pre-populate initial selection when dialog opens
  useEffect(() => {
    if (!props.open) {
      dragCounterRef.current = 0
      setIsDragging(false)
      return
    }

    // Pre-populate if `props.value` is passed
    if (props.value) {
      if (Array.isArray(props.value)) {
        if (props.mode === 'file') {
          setSelectedFiles(props.value as FileSchema[])
        }
      } else if (props.mode === 'file') {
        setSelectedFiles([props.value as FileSchema])
      }
    }
  }, [props.open, props.mode, props.value])

  const params = useMemo(() => {
    const builder = new PaginateQueryBuilder()
      .limit(32)
      .sortBy('createdAt', 'DESC')
      .search(search)

    const effectiveResourceType =
      props.resourceType ?? acceptSpec?.primaryResourceType
    if (effectiveResourceType) {
      builder.eq('resource_type', effectiveResourceType)
    }

    if (activeFolder) {
      builder.eq('folder', activeFolder)
    }

    return builder.build()
  }, [
    activeFolder,
    props.resourceType,
    acceptSpec?.primaryResourceType,
    search,
  ])

  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
    useInfiniteDataFileOverview(params)
  const { data: folders = [] } = useDataFileFolders()

  const rawFiles = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data]
  )

  // Filter client-side if acceptSpec requires specific mime/extension matching
  const files = useMemo(() => {
    if (!acceptSpec) return rawFiles
    return rawFiles.filter((file) => acceptSpec.isMatch(file))
  }, [rawFiles, acceptSpec])

  const currentPage = data?.pages[data.pages.length - 1]
  const visibleTotal = currentPage?.meta.totalItems ?? 0
  const allFilesCount = folders.reduce(
    (total, folder) => total + folder.count,
    0
  )

  // Match URL-based pre-selection with fetched files once loaded
  useEffect(() => {
    if (!props.open || props.mode !== 'url' || !props.value) return

    if (Array.isArray(props.value)) {
      const urls = new Set(props.value as string[])
      const matched = files.filter((f) => urls.has(f.url))
      if (matched.length > 0) {
        setSelectedFiles((current) => {
          const currentIds = new Set(current.map((c) => c.public_id))
          const toAdd = matched.filter((m) => !currentIds.has(m.public_id))
          return toAdd.length > 0 ? [...current, ...toAdd] : current
        })
      }
    } else {
      const url = props.value as string
      const matched = files.find((f) => f.url === url)
      if (matched) {
        setSelectedFiles((current) =>
          current.some((c) => c.public_id === matched.public_id)
            ? current
            : [matched]
        )
      }
    }
  }, [props.open, props.mode, props.value, files])

  // Infinite scroll observer
  useEffect(() => {
    const target = loadMoreRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { rootMargin: '240px' }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, files.length])

  const handleFolderSelect = (folder: string | null) => {
    setActiveFolder(folder)
    setTargetUploadFolder(folder ?? '__root__')
    setSearchInput('')
    setSearch('')
  }

  const handleCreateFolder = async (folderName: string) => {
    try {
      await apiCreateFolder({ folder: folderName })
      void queryClient.invalidateQueries({ queryKey: fileQueryKeys.folders })
      setActiveFolder(folderName)
      setTargetUploadFolder(folderName)
      toast.success(
        t('files.folders.createSuccess', 'Folder created successfully')
      )
    } catch (err) {
      if (err instanceof AxiosError) {
        restApiErrorHandler(err)
        return
      }

      toast.error(
        err instanceof Error ? err.message : 'Failed to create folder'
      )
    }
  }

  const toggleFile = (file: FileSchema) => {
    setSelectedFiles((current) => {
      const exists = current.some((item) => item.public_id === file.public_id)

      if (!multiple) {
        return exists ? [] : [file]
      }

      if (exists) {
        return current.filter((item) => item.public_id !== file.public_id)
      }

      return [...current, file]
    })
  }

  // Upload handler with explicit target folder support
  const handleUploadFiles = useCallback(
    async (uploadedFileList: File[]) => {
      if (uploadedFileList.length === 0) return

      // Validate accept
      if (acceptSpec) {
        const invalidFile = uploadedFileList.find(
          (file) =>
            !acceptSpec.isMatch({
              mime: file.type,
              original_name: file.name,
            })
        )
        if (invalidFile) {
          toast.error(
            t('files.picker.invalidType', {
              types: acceptSpec.label,
            })
          )
          return
        }
      }

      const uploadFolder =
        targetUploadFolder === '__root__' ? null : targetUploadFolder
      const folderDisplayName = uploadFolder ?? t('files.folders.root', 'Root')

      setIsUploading(true)
      const toastId = toast.loading(
        t('files.picker.uploading', { count: uploadedFileList.length })
      )

      try {
        const newlyUploaded: FileSchema[] = []

        for (const file of uploadedFileList) {
          const uploaded = await apiUploadFile({
            file,
            folder: uploadFolder,
            disk: 'public',
          })
          newlyUploaded.push(uploaded)
        }

        toast.success(
          t('files.picker.uploadedToFolder', {
            count: newlyUploaded.length,
            folder: folderDisplayName,
          }),
          { id: toastId }
        )

        // Invalidate queries so the new files appear in the library
        void queryClient.invalidateQueries({ queryKey: fileQueryKeys.all })
        void queryClient.invalidateQueries({ queryKey: fileQueryKeys.folders })

        // Switch to the folder where file was uploaded if not already there
        if (activeFolder !== uploadFolder) {
          setActiveFolder(uploadFolder)
        }

        // Auto-select the newly uploaded file(s)
        setSelectedFiles((current) => {
          if (!multiple) {
            return [newlyUploaded[0]]
          }
          const currentIds = new Set(current.map((c) => c.public_id))
          const filteredNew = newlyUploaded.filter(
            (item) => !currentIds.has(item.public_id)
          )
          return [...filteredNew, ...current]
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed'
        toast.error(message, { id: toastId })
      } finally {
        setIsUploading(false)
      }
    },
    [acceptSpec, activeFolder, multiple, queryClient, t, targetUploadFolder]
  )

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files ?? [])
    if (fileList.length > 0) {
      void handleUploadFiles(fileList)
    }
    e.target.value = ''
  }

  // Drag & drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      void handleUploadFiles(droppedFiles)
    }
  }

  const handleConfirm = () => {
    if (selectedFiles.length === 0) return

    if (props.mode === 'url' && props.multiple === true) {
      props.onValueChange(
        selectedFiles.map((file) => file.url),
        selectedFiles
      )
    } else if (props.mode === 'url') {
      const [file] = selectedFiles
      props.onValueChange(file?.url ?? null, file)
    } else if (props.multiple === true) {
      props.onValueChange(selectedFiles)
    } else {
      props.onValueChange(selectedFiles[0] ?? null)
    }

    setSelectedFiles([])
    props.onOpenChange(false)
  }

  const currentUploadFolderLabel =
    targetUploadFolder === '__root__'
      ? t('files.folders.root', 'Root')
      : targetUploadFolder

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        className='border-border/80 bg-background flex h-[88vh] max-h-205 min-h-145 w-[96vw] flex-col overflow-hidden rounded-2xl border p-0 shadow-2xl sm:max-w-5xl lg:max-w-6xl'
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Hidden native input for direct upload */}
        <input
          ref={fileInputRef}
          type='file'
          accept={acceptSpec?.acceptString}
          multiple={multiple}
          className='hidden'
          onChange={handleFileInputChange}
        />

        {/* Drag & Drop Visual Overlay */}
        {isDragging && (
          <div className='bg-background/85 pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 backdrop-blur-xs'>
            <div className='border-primary/50 bg-primary/10 flex size-20 items-center justify-center rounded-3xl border-2 border-dashed'>
              <UploadCloud className='text-primary size-10 animate-bounce' />
            </div>
            <p className='text-foreground text-base font-semibold'>
              {t('files.picker.dropzoneTitle', 'Drop files to upload')}
            </p>
            <p className='text-muted-foreground text-xs'>
              {t('files.picker.dropzoneSubtitle', {
                folder: currentUploadFolderLabel,
              })}
            </p>
          </div>
        )}

        {/* Header */}
        <DialogHeader className='border-border/60 bg-muted/20 flex shrink-0 flex-row items-center justify-between gap-4 border-b py-3.5 pr-14 pl-6'>
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <div className='flex items-center gap-2'>
              <DialogTitle className='text-base font-bold'>
                {props.title ?? t('files.picker.title')}
              </DialogTitle>
              {acceptSpec && (
                <Badge
                  variant='secondary'
                  className='font-mono text-[10px] font-normal tracking-wide'
                >
                  {acceptSpec.label}
                </Badge>
              )}
            </div>
            <DialogDescription className='text-xs'>
              {props.description ?? t('files.picker.description')}
            </DialogDescription>
          </div>

          {/* Direct Upload Actions & Target Folder Selector */}
          <div className='flex shrink-0 items-center gap-2'>
            <div className='flex items-center gap-1.5'>
              <span className='text-muted-foreground hidden text-xs lg:inline'>
                {t('files.picker.uploadTo', 'Upload to:')}
              </span>
              <Select
                value={targetUploadFolder}
                onValueChange={setTargetUploadFolder}
              >
                <SelectTrigger className='h-8 w-28 text-xs sm:w-36'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__root__' className='text-xs'>
                    📁 {t('files.folders.root', 'Root')}
                  </SelectItem>
                  {folders.map((f) => (
                    <SelectItem
                      key={f.folder}
                      value={f.folder}
                      className='text-xs'
                    >
                      📁 {f.folder}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type='button'
              size='sm'
              className='h-8 gap-1.5 text-xs font-medium'
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className='size-3.5 animate-spin' />
              ) : (
                <Upload className='size-3.5' />
              )}
              <span>{t('files.picker.upload', 'Upload')}</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Search & Toolbar Bar */}
        <div className='border-border/60 flex shrink-0 items-center justify-between gap-3 border-b px-6 py-2.5'>
          <div className='relative max-w-sm flex-1'>
            <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('files.picker.search')}
              className='h-8 pr-7 pl-9 text-xs'
            />
            {searchInput && (
              <button
                type='button'
                onClick={() => {
                  setSearchInput('')
                  setSearch('')
                }}
                className='text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2'
              >
                <X className='size-3.5' />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className='border-border/60 bg-muted/40 flex items-center rounded-lg border p-0.5'>
            <Button
              type='button'
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size='icon'
              className='size-7 rounded-md'
              onClick={() => setViewMode('grid')}
              title={t('files.view.grid')}
            >
              <LayoutGrid className='size-3.5' />
            </Button>
            <Button
              type='button'
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size='icon'
              className='size-7 rounded-md'
              onClick={() => setViewMode('list')}
              title={t('files.view.table')}
            >
              <List className='size-3.5' />
            </Button>
          </div>
        </div>

        {/* Content Body: Sidebar + File List */}
        <div className='grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)]'>
          <FilePickerFolderPane
            folders={folders}
            activeFolder={activeFolder}
            allFilesCount={allFilesCount}
            onSelect={handleFolderSelect}
            onCreateFolder={handleCreateFolder}
          />

          <div className='bg-muted/10 relative min-h-0 overflow-hidden'>
            <ScrollArea className='h-full'>
              {viewMode === 'grid' ? (
                <div className='grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4'>
                  {files.map((file) => {
                    const selected = selectedFiles.some(
                      (item) => item.public_id === file.public_id
                    )
                    return (
                      <button
                        key={file.public_id}
                        type='button'
                        className={cn(
                          'group bg-card text-card-foreground hover:border-primary/60 relative flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-150',
                          selected
                            ? 'border-primary ring-primary/30 shadow-md ring-2'
                            : 'border-border/80 hover:shadow-xs'
                        )}
                        onClick={() => toggleFile(file)}
                      >
                        {/* Thumbnail Stage */}
                        <div className='bg-muted/50 relative flex aspect-4/3 w-full items-center justify-center overflow-hidden'>
                          <FilePreviewThumbnail file={file} />

                          {/* Selection Checkmark */}
                          {selected && (
                            <span className='bg-primary text-primary-foreground ring-background absolute top-2 right-2 flex size-5 items-center justify-center rounded-full shadow-xs ring-2'>
                              <Check className='size-3 stroke-[2.5]' />
                            </span>
                          )}

                          {/* Disk Badge */}
                          {file.disk && (
                            <span className='bg-background/80 text-muted-foreground py-0.2 absolute bottom-1.5 left-1.5 rounded px-1 font-mono text-[9px] uppercase backdrop-blur-xs'>
                              {file.disk}
                            </span>
                          )}
                        </div>

                        {/* Card Info */}
                        <div className='space-y-0.5 p-2.5'>
                          <p
                            className='truncate text-xs font-semibold'
                            title={file.original_name}
                          >
                            {file.original_name}
                          </p>
                          <div className='text-muted-foreground flex items-center justify-between text-[11px]'>
                            <span className='truncate'>
                              {file.folder ?? t('files.folders.root')}
                            </span>
                            <span className='shrink-0 font-mono font-medium'>
                              {formatBytes(file.size)}
                            </span>
                          </div>
                        </div>
                      </button>
                    )
                  })}

                  {!isFetching && files.length === 0 && (
                    <div className='text-muted-foreground col-span-full py-16 text-center text-xs'>
                      <div className='border-border/60 bg-muted/30 mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl border'>
                        <UploadCloud className='text-muted-foreground/60 size-6' />
                      </div>
                      <p className='text-foreground text-sm font-medium'>
                        {t('files.picker.empty')}
                      </p>
                      <p className='text-muted-foreground mt-1'>
                        {t('files.picker.dropzoneSubtitle', {
                          folder: currentUploadFolderLabel,
                        })}
                      </p>
                    </div>
                  )}

                  {files.length > 0 && (
                    <div
                      ref={loadMoreRef}
                      className='text-muted-foreground col-span-full flex min-h-12 items-center justify-center gap-2 text-xs'
                    >
                      {isFetchingNextPage ? (
                        <>
                          <Loader2 className='size-3.5 animate-spin' />
                          {t('files.picker.loadingMore')}
                        </>
                      ) : hasNextPage ? (
                        t('files.picker.loadMoreHint', {
                          count: files.length,
                          total: visibleTotal,
                        })
                      ) : (
                        t('files.picker.loadedAll', {
                          count: files.length,
                          total: visibleTotal,
                        })
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* List View */
                <div className='divide-border/60 flex flex-col divide-y p-3'>
                  {files.map((file) => {
                    const selected = selectedFiles.some(
                      (item) => item.public_id === file.public_id
                    )
                    return (
                      <button
                        key={file.public_id}
                        type='button'
                        className={cn(
                          'hover:bg-muted/60 flex items-center gap-3 rounded-lg p-2 text-left transition-colors',
                          selected && 'bg-primary/5'
                        )}
                        onClick={() => toggleFile(file)}
                      >
                        <div className='bg-muted/50 border-border/80 relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border'>
                          <FilePreviewThumbnail file={file} />
                          {selected && (
                            <span className='bg-primary text-primary-foreground ring-background absolute top-1 right-1 flex size-4 items-center justify-center rounded-full ring-1'>
                              <Check className='size-2.5' />
                            </span>
                          )}
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p className='truncate text-xs font-semibold'>
                            {file.original_name}
                          </p>
                          <div className='text-muted-foreground flex items-center gap-2 text-[11px]'>
                            <span>
                              {file.folder ?? t('files.folders.root')}
                            </span>
                            <span>•</span>
                            <span className='font-mono'>
                              {formatBytes(file.size)}
                            </span>
                            {file.mime && (
                              <>
                                <span>•</span>
                                <span className='font-mono'>{file.mime}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {file.disk && (
                          <Badge
                            variant='outline'
                            className='shrink-0 font-mono text-[10px] uppercase'
                          >
                            {file.disk}
                          </Badge>
                        )}
                      </button>
                    )
                  })}

                  {!isFetching && files.length === 0 && (
                    <div className='text-muted-foreground py-16 text-center text-xs'>
                      {t('files.picker.empty')}
                    </div>
                  )}

                  {files.length > 0 && (
                    <div
                      ref={loadMoreRef}
                      className='text-muted-foreground flex min-h-10 items-center justify-center gap-2 py-3 text-xs'
                    >
                      {isFetchingNextPage ? (
                        <>
                          <Loader2 className='size-3.5 animate-spin' />
                          {t('files.picker.loadingMore')}
                        </>
                      ) : hasNextPage ? (
                        t('files.picker.loadMoreHint', {
                          count: files.length,
                          total: visibleTotal,
                        })
                      ) : (
                        t('files.picker.loadedAll', {
                          count: files.length,
                          total: visibleTotal,
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className='border-border/60 bg-muted/20 flex shrink-0 flex-row items-center justify-between border-t px-6 py-3.5'>
          <div className='flex items-center gap-2'>
            {selectedFiles.length > 0 ? (
              <div className='flex items-center gap-2'>
                <Badge variant='secondary' className='text-xs font-medium'>
                  {t('files.picker.selectedCount', {
                    count: selectedFiles.length,
                  })}
                </Badge>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='text-muted-foreground hover:text-foreground h-7 px-2 text-xs'
                  onClick={() => setSelectedFiles([])}
                >
                  {t('files.picker.clearSelection', 'Clear selection')}
                </Button>
              </div>
            ) : (
              <span className='text-muted-foreground text-xs'>
                {activeFolder
                  ? `${activeFolder}`
                  : t('files.folders.all', 'All files')}
              </span>
            )}
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='h-8 text-xs'
              onClick={() => props.onOpenChange(false)}
            >
              {t('buttons.cancel')}
            </Button>
            <Button
              size='sm'
              className='h-8 gap-1 text-xs'
              disabled={selectedFiles.length === 0}
              onClick={handleConfirm}
            >
              {multiple
                ? t('files.picker.selectCount', {
                    count: selectedFiles.length,
                  })
                : t('files.picker.select')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FilePickerFolderPane({
  folders,
  activeFolder,
  allFilesCount,
  onSelect,
  onCreateFolder,
}: {
  folders: FolderSchema[]
  activeFolder: string | null
  allFilesCount: number
  onSelect: (folder: string | null) => void
  onCreateFolder?: (folder: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async () => {
    const trimmed = newFolderName.trim()
    if (!trimmed || !onCreateFolder) return
    setIsSubmitting(true)
    try {
      await onCreateFolder(trimmed)
      setNewFolderName('')
      setIsCreating(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <aside className='border-border/60 bg-muted/15 flex min-h-0 flex-col gap-2 border-r p-3'>
      <div className='flex items-center justify-between px-1 py-0.5'>
        <h3 className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
          {t('files.folders.title')}
        </h3>
        <div className='flex items-center gap-1'>
          <Badge variant='secondary' className='text-[10px]'>
            {folders.length}
          </Badge>
          {onCreateFolder && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='hover:bg-muted text-muted-foreground hover:text-foreground size-5 rounded'
              onClick={() => setIsCreating((prev) => !prev)}
              title={t('files.picker.newFolder', 'New folder')}
            >
              <Plus className='size-3' />
            </Button>
          )}
        </div>
      </div>

      {isCreating && (
        <div className='flex items-center gap-1 px-1 py-1'>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate()
              if (e.key === 'Escape') setIsCreating(false)
            }}
            placeholder='Folder name...'
            className='h-7 text-xs'
            autoFocus
          />
          <Button
            type='button'
            size='icon'
            className='size-7 shrink-0'
            disabled={!newFolderName.trim() || isSubmitting}
            onClick={() => void handleCreate()}
          >
            {isSubmitting ? (
              <Loader2 className='size-3 animate-spin' />
            ) : (
              <Check className='size-3' />
            )}
          </Button>
        </div>
      )}

      <Button
        type='button'
        variant={activeFolder === null ? 'secondary' : 'ghost'}
        className={cn(
          'h-8 justify-start gap-2 rounded-lg px-2.5 text-xs font-medium',
          activeFolder === null && 'bg-secondary font-semibold'
        )}
        onClick={() => onSelect(null)}
      >
        <Folder className='text-primary size-3.5 shrink-0' />
        <span className='min-w-0 flex-1 truncate text-left'>
          {t('files.folders.all')}
        </span>
        <span className='text-muted-foreground font-mono text-[10px]'>
          {allFilesCount}
        </span>
      </Button>

      <ScrollArea className='min-h-0 flex-1 pr-1'>
        <div className='flex flex-col gap-1'>
          {folders.map((folder) => (
            <Button
              key={folder.folder}
              type='button'
              variant={activeFolder === folder.folder ? 'secondary' : 'ghost'}
              className={cn(
                'h-8 justify-start gap-2 rounded-lg px-2.5 text-xs font-medium',
                activeFolder === folder.folder && 'bg-secondary font-semibold'
              )}
              onClick={() => onSelect(folder.folder)}
            >
              <Folder className='text-primary/80 size-3.5 shrink-0' />
              <span className='min-w-0 flex-1 truncate text-left'>
                {folder.folder}
              </span>
              <span className='text-muted-foreground font-mono text-[10px]'>
                {folder.count}
              </span>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  )
}
