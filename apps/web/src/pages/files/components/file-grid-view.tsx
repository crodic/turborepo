import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import type { Table } from '@tanstack/react-table'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import {
  Copy,
  Eye,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileSpreadsheet,
  FileText,
  Loader2,
  MoreVertical,
  MoveRight,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBytes } from '../columns'
import {
  FilePreviewThumbnail,
  isPreviewableImage,
  isPreviewableVideo,
} from '../file-preview'
import type { FileSchema } from '../schema'

export interface FileGridViewProps {
  files: FileSchema[]
  table: Table<FileSchema>
  isFetching?: boolean
  inspectedFile: FileSchema | null
  onInspectFile: (file: FileSchema) => void
  onPreviewFile: (file: FileSchema) => void
  onCopyUrl: (file: FileSchema) => void
  onMoveFile: (file: FileSchema) => void
  onDeleteFile: (file: FileSchema) => void
  canUpdate?: boolean
  canDelete?: boolean
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  fetchNextPage?: () => void
  totalItems?: number
}

function getFileExtension(filename: string): string {
  return filename.split('?')[0]?.split('.').pop()?.toLowerCase() ?? ''
}

function getFileIconAndBadge(file: FileSchema) {
  const ext = getFileExtension(file.original_name)
  const mime = file.mime.toLowerCase()

  if (ext === 'pdf' || mime.includes('pdf')) {
    return {
      icon: FileText,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      label: 'PDF',
    }
  }
  if (
    ['xls', 'xlsx', 'csv'].includes(ext) ||
    mime.includes('spreadsheet') ||
    mime.includes('csv')
  ) {
    return {
      icon: FileSpreadsheet,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      label: ext.toUpperCase() || 'EXCEL',
    }
  }
  if (
    ['doc', 'docx', 'txt', 'rtf', 'md'].includes(ext) ||
    mime.includes('word') ||
    mime.includes('text')
  ) {
    return {
      icon: FileText,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      label: ext.toUpperCase() || 'DOC',
    }
  }
  if (
    ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) ||
    mime.includes('archive') ||
    mime.includes('compressed')
  ) {
    return {
      icon: FileArchive,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      label: ext.toUpperCase() || 'ZIP',
    }
  }
  if (
    [
      'js',
      'ts',
      'jsx',
      'tsx',
      'json',
      'html',
      'css',
      'py',
      'sql',
      'yaml',
      'yml',
    ].includes(ext)
  ) {
    return {
      icon: FileCode,
      color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
      label: ext.toUpperCase() || 'CODE',
    }
  }
  if (
    mime.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)
  ) {
    return {
      icon: FileAudio,
      color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
      label: ext.toUpperCase() || 'AUDIO',
    }
  }

  return {
    icon: File,
    color: 'text-muted-foreground bg-muted border-border',
    label: ext.toUpperCase() || 'FILE',
  }
}

interface FileCardItemProps {
  file: FileSchema
  isSelected: boolean
  isInspected: boolean
  canUpdate?: boolean
  canDelete?: boolean
  onInspectFile: (file: FileSchema) => void
  onPreviewFile: (file: FileSchema) => void
  onCopyUrl: (file: FileSchema) => void
  onMoveFile: (file: FileSchema) => void
  onDeleteFile: (file: FileSchema) => void
  onToggleSelect?: () => void
}

const FileCardItem = memo(function FileCardItem({
  file,
  isSelected,
  isInspected,
  canUpdate,
  canDelete,
  onInspectFile,
  onPreviewFile,
  onCopyUrl,
  onMoveFile,
  onDeleteFile,
  onToggleSelect,
}: FileCardItemProps) {
  const { t } = useTranslation()
  const isMedia = isPreviewableImage(file) || isPreviewableVideo(file)
  const docBadge = getFileIconAndBadge(file)
  const DocIcon = docBadge.icon

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={() => onInspectFile(file)}
      onDoubleClick={() => onPreviewFile(file)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onPreviewFile(file)
        } else if (e.key === ' ') {
          e.preventDefault()
          onInspectFile(file)
        }
      }}
      className={cn(
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border text-left transition-all duration-200 select-none',
        'hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-md',
        isSelected
          ? 'border-primary bg-primary/5 ring-primary/40 shadow-sm ring-2'
          : isInspected
            ? 'border-primary/80 bg-accent/30 ring-primary/30 ring-1'
            : 'border-border/70 bg-card'
      )}
    >
      {/* Top Toolbar Overlay */}
      <div className='pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-2'>
        {/* Checkbox */}
        {canDelete && (
          <div
            className={cn(
              'pointer-events-auto transition-opacity',
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              aria-label={t('files.table.selectRow')}
              className='bg-background/90 border-border/80 shadow-xs backdrop-blur-xs'
            />
          </div>
        )}

        {/* Action Dropdown */}
        <div
          className='pointer-events-auto ml-auto opacity-0 transition-opacity group-hover:opacity-100'
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='bg-background/85 text-foreground hover:bg-background size-7 rounded-lg shadow-xs backdrop-blur-xs'
              >
                <MoreVertical className='size-3.5' />
                <span className='sr-only'>File actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-44'>
              <DropdownMenuItem
                onClick={() => onPreviewFile(file)}
                className='gap-2'
              >
                <Eye className='size-4' />
                {t('files.actions.preview')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  onCopyUrl(file)
                  toast.success(t('files.inspector.urlCopied'))
                }}
                className='gap-2'
              >
                <Copy className='size-4' />
                {t('files.actions.copyUrl')}
              </DropdownMenuItem>
              {canUpdate && (
                <DropdownMenuItem
                  onClick={() => onMoveFile(file)}
                  className='gap-2'
                >
                  <MoveRight className='size-4' />
                  {t('files.actions.move')}
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant='destructive'
                    onClick={() => onDeleteFile(file)}
                    className='gap-2'
                  >
                    <Trash2 className='size-4' />
                    {t('files.actions.delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Thumbnail Box */}
      <div className='bg-muted/40 border-border/50 relative flex aspect-16/10 w-full items-center justify-center overflow-hidden border-b'>
        {isMedia ? (
          <div className='size-full overflow-hidden transition-transform duration-300 group-hover:scale-105'>
            <FilePreviewThumbnail
              file={file}
              className='size-full object-cover'
            />
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center gap-1.5 p-4 transition-transform duration-300 group-hover:scale-105'>
            <div
              className={cn(
                'flex size-12 items-center justify-center rounded-xl border',
                docBadge.color
              )}
            >
              <DocIcon className='size-6' />
            </div>
            <span className='text-muted-foreground text-[10px] font-semibold tracking-wider uppercase'>
              {docBadge.label}
            </span>
          </div>
        )}

        {/* Media dimension tag */}
        {file.width && file.height && (
          <div className='absolute bottom-1.5 left-1.5 z-10'>
            <span className='rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs'>
              {file.width}&times;{file.height}
            </span>
          </div>
        )}
      </div>

      {/* Content Details */}
      <div className='flex flex-col p-2.5'>
        <p
          title={file.original_name}
          className='text-foreground group-hover:text-primary truncate text-xs font-semibold transition-colors'
        >
          {file.original_name}
        </p>

        <div className='text-muted-foreground mt-1 flex items-center justify-between text-[11px]'>
          <span>{formatBytes(file.size)}</span>
          <span>{format(new Date(file.createdAt), 'MMM d')}</span>
        </div>
      </div>
    </div>
  )
})

export function FileGridView({
  files,
  table,
  isFetching,
  inspectedFile,
  onInspectFile,
  onPreviewFile,
  onCopyUrl,
  onMoveFile,
  onDeleteFile,
  canUpdate,
  canDelete,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  totalItems,
}: FileGridViewProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [columnsCount, setColumnsCount] = useState(4)
  const [scrollMargin, setScrollMargin] = useState(0)

  // Dynamically calculate column count based on available container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const updateColumns = (width: number) => {
      if (width < 500) {
        setColumnsCount(2)
      } else if (width < 720) {
        setColumnsCount(3)
      } else if (width < 1040) {
        setColumnsCount(4)
      } else if (width < 1360) {
        setColumnsCount(5)
      } else {
        setColumnsCount(6)
      }
    }

    updateColumns(el.clientWidth)

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        updateColumns(entry.contentRect.width)
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Calculate container top offset for window virtualizer
  useEffect(() => {
    const updateOffset = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setScrollMargin(rect.top + window.scrollY)
      }
    }

    updateOffset()
    window.addEventListener('resize', updateOffset, { passive: true })
    return () => window.removeEventListener('resize', updateOffset)
  }, [])

  // Group items into responsive rows
  const rows = useMemo(() => {
    const result: FileSchema[][] = []
    for (let i = 0; i < files.length; i += columnsCount) {
      result.push(files.slice(i, i + columnsCount))
    }
    return result
  }, [files, columnsCount])

  // TanStack Virtual window virtualizer
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 260,
    overscan: 2,
    scrollMargin,
  })

  // IntersectionObserver for auto-fetching next page
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !fetchNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '400px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isFetching && files.length === 0) {
    return (
      <div className='grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'>
        {Array.from({ length: 12 }).map((_, idx) => (
          <div
            key={idx}
            className='border-border/50 flex flex-col gap-2 rounded-xl border p-2.5'
          >
            <Skeleton className='aspect-16/10 w-full rounded-lg' />
            <Skeleton className='h-4 w-3/4' />
            <Skeleton className='h-3 w-1/2' />
          </div>
        ))}
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className='border-border/70 flex min-h-75 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center'>
        <div className='bg-muted/60 text-muted-foreground mb-3 flex size-14 items-center justify-center rounded-2xl'>
          <File className='size-7' />
        </div>
        <h4 className='text-foreground text-sm font-semibold'>
          {t('files.upload.empty')}
        </h4>
        <p className='text-muted-foreground mt-1 max-w-sm text-xs'>
          {t('files.upload.description')}
        </p>
      </div>
    )
  }

  return (
    <div className='flex w-full flex-col'>
      {/* Virtual Container */}
      <div
        ref={containerRef}
        className='relative w-full'
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const rowFiles = rows[virtualRow.index] ?? []

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className='absolute top-0 left-0 w-full'
              style={{
                transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              <div
                className='grid gap-3.5 pb-3.5'
                style={{
                  gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))`,
                }}
              >
                {rowFiles.map((file) => {
                  const row = table.getRow(file.public_id)
                  const isSelected = row?.getIsSelected() ?? false
                  const isInspected =
                    inspectedFile?.public_id === file.public_id

                  return (
                    <FileCardItem
                      key={file.public_id}
                      file={file}
                      isSelected={isSelected}
                      isInspected={isInspected}
                      canUpdate={canUpdate}
                      canDelete={canDelete}
                      onInspectFile={onInspectFile}
                      onPreviewFile={onPreviewFile}
                      onCopyUrl={onCopyUrl}
                      onMoveFile={onMoveFile}
                      onDeleteFile={onDeleteFile}
                      onToggleSelect={() => row?.toggleSelected()}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Sentinel trigger for infinite scroll */}
      <div ref={sentinelRef} className='h-4 w-full' />

      {/* Loading More Indicator */}
      {isFetchingNextPage && (
        <div className='text-muted-foreground flex animate-pulse items-center justify-center gap-2 py-6 text-xs'>
          <Loader2 className='text-primary size-4 animate-spin' />
          <span>{t('files.loadingMore', 'Loading more files...')}</span>
        </div>
      )}

      {/* Loaded All Files Status */}
      {!hasNextPage && files.length > 0 && (
        <div className='text-muted-foreground/60 py-6 text-center text-xs'>
          {totalItems
            ? t('files.allLoadedWithCount', 'Showing all {{count}} files', {
                count: totalItems,
              })
            : t('files.allLoaded', 'All files loaded')}
        </div>
      )}
    </div>
  )
}
