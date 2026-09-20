import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  FileIcon,
  Globe,
  Info,
  Loader2,
  Lock,
  MoveRight,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatBytes } from '../columns'
import {
  FilePreviewThumbnail,
  isPreviewableAudio,
  isPreviewableImage,
  isPreviewableVideo,
} from '../file-preview'
import { apiUpdateFile, fileQueryKeys } from '../queries'
import type { FileSchema } from '../schema'

interface FileInspectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileSchema | null
  onPreview: (file: FileSchema) => void
  onCopyUrl: (file: FileSchema) => void
  onMove: (file: FileSchema) => void
  onDelete: (file: FileSchema) => void
  onFileUpdated?: (file: FileSchema) => void
  canUpdate?: boolean
  canDelete?: boolean
}

export function FileInspector({
  open,
  onOpenChange,
  file,
  onPreview,
  onCopyUrl,
  onMove,
  onDelete,
  onFileUpdated,
  canUpdate,
  canDelete,
}: FileInspectorProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [currentFile, setCurrentFile] = useState<FileSchema | null>(file)

  useEffect(() => {
    setCurrentFile(file)
  }, [file])

  const updateDiskMutation = useMutation({
    mutationFn: async (disk: 'public' | 'local') => {
      if (!currentFile) return
      return apiUpdateFile({
        publicId: currentFile.public_id,
        data: { disk },
      })
    },
    onSuccess: (updated) => {
      if (updated) {
        setCurrentFile(updated)
        onFileUpdated?.(updated)
      }
      void queryClient.invalidateQueries({ queryKey: fileQueryKeys.all })
      toast.success(t('files.disk.changeSuccess'))
    },
    onError: () => {
      toast.error(t('files.disk.changeError'))
    },
  })

  const activeFile = currentFile ?? file

  const handleCopy = async () => {
    if (!activeFile) return
    await onCopyUrl(activeFile)
    setCopied(true)
    toast.success(t('files.inspector.urlCopied'))
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='border-border bg-background flex h-full w-full flex-col gap-0 overflow-hidden border-l p-0 sm:max-w-md'
      >
        <SheetHeader className='border-border flex flex-row items-center space-y-0 border-b px-5 py-4 pr-12'>
          <div className='flex items-center gap-2'>
            <Info className='text-primary size-4' />
            <SheetTitle className='text-base font-semibold'>
              {t('files.inspector.title')}
            </SheetTitle>
          </div>
        </SheetHeader>

        {!activeFile ? (
          <div className='flex flex-1 flex-col items-center justify-center p-8 text-center'>
            <div className='bg-muted text-muted-foreground mb-3 flex size-14 items-center justify-center rounded-2xl'>
              <FileIcon className='size-7' />
            </div>
            <p className='text-foreground text-sm font-medium'>
              {t('files.inspector.empty')}
            </p>
          </div>
        ) : (
          <div className='min-h-0 flex-1 overflow-y-auto p-5'>
            <div className='flex flex-col gap-5'>
              {/* Media Preview Box */}
              <div
                className='border-border/80 bg-muted/40 group relative flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-xl border shadow-inner'
                onClick={() => onPreview(activeFile)}
              >
                {isPreviewableImage(activeFile) ||
                isPreviewableVideo(activeFile) ||
                isPreviewableAudio(activeFile) ? (
                  <FilePreviewThumbnail
                    file={activeFile}
                    className='size-full object-contain transition-transform duration-200 group-hover:scale-105'
                  />
                ) : (
                  <div className='flex flex-col items-center gap-2 p-6'>
                    <FileIcon className='text-muted-foreground size-12' />
                    <span className='text-muted-foreground text-xs font-medium uppercase'>
                      {activeFile.mime}
                    </span>
                  </div>
                )}

                <div className='absolute top-2 right-2 flex gap-1.5 opacity-80 transition-opacity group-hover:opacity-100'>
                  <Button
                    variant='secondary'
                    size='icon'
                    className='bg-background/80 size-7 rounded-md backdrop-blur-xs'
                    onClick={(e) => {
                      e.stopPropagation()
                      onPreview(activeFile)
                    }}
                    title={t('files.actions.preview')}
                  >
                    <ExternalLink className='size-3.5' />
                  </Button>
                </div>
              </div>

              {/* Title & Badges */}
              <div className='flex flex-col gap-1.5'>
                <h3 className='text-foreground text-base leading-snug font-bold break-all'>
                  {activeFile.original_name}
                </h3>
                <div className='flex flex-wrap items-center gap-1.5'>
                  <Badge variant='outline' className='text-xs uppercase'>
                    {activeFile.resource_type}
                  </Badge>
                  <Badge
                    variant={
                      activeFile.status === 'active' ? 'secondary' : 'outline'
                    }
                    className='text-xs capitalize'
                  >
                    {activeFile.status}
                  </Badge>
                  {activeFile.disk && (
                    <Badge
                      variant='outline'
                      className={cn(
                        'gap-1 text-xs',
                        activeFile.disk === 'local'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'border-border bg-muted/40 text-muted-foreground'
                      )}
                    >
                      {activeFile.disk === 'local' ? (
                        <Lock className='size-3' />
                      ) : (
                        <Globe className='size-3' />
                      )}
                      <span>
                        {activeFile.disk === 'local'
                          ? t('files.disk.local')
                          : t('files.disk.public')}
                      </span>
                    </Badge>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className='grid grid-cols-2 gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleCopy}
                  className='h-9 justify-center gap-2'
                >
                  {copied ? (
                    <Check className='size-4 text-emerald-500' />
                  ) : (
                    <Copy className='size-4' />
                  )}
                  <span>
                    {copied ? 'Copied!' : t('files.inspector.copyUrl')}
                  </span>
                </Button>

                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => onPreview(activeFile)}
                  className='h-9 justify-center gap-2'
                >
                  <Eye className='size-4' />
                  <span>{t('files.actions.preview')}</span>
                </Button>

                {canUpdate && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => onMove(activeFile)}
                    className='h-9 justify-center gap-2'
                  >
                    <MoveRight className='size-4' />
                    <span>{t('files.actions.move')}</span>
                  </Button>
                )}

                {canDelete && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => onDelete(activeFile)}
                    className='text-destructive hover:text-destructive hover:bg-destructive/10 h-9 justify-center gap-2'
                  >
                    <Trash2 className='size-4' />
                    <span>{t('files.actions.delete')}</span>
                  </Button>
                )}
              </div>

              <Separator />

              {/* File Metadata Details */}
              <div className='flex flex-col gap-3'>
                <h4 className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                  {t('files.inspector.information')}
                </h4>

                <div className='border-border/70 bg-card/60 grid grid-cols-1 gap-2.5 rounded-xl border p-3.5 text-xs'>
                  <div className='flex items-center justify-between py-1'>
                    <span className='text-muted-foreground'>
                      {t('files.inspector.size')}
                    </span>
                    <span className='text-foreground font-medium'>
                      {formatBytes(activeFile.size)} (
                      {activeFile.size.toLocaleString()} B)
                    </span>
                  </div>

                  <Separator />

                  <div className='flex items-center justify-between py-1'>
                    <span className='text-muted-foreground'>
                      {t('files.inspector.mime')}
                    </span>
                    <span className='text-foreground max-w-50 truncate font-mono font-medium'>
                      {activeFile.mime}
                    </span>
                  </div>

                  {/* Storage Disk Selector & Description */}
                  <Separator />
                  <div className='flex items-center justify-between py-1'>
                    <div className='flex flex-col gap-0.5'>
                      <span className='text-muted-foreground font-medium'>
                        {t('files.disk.title')}
                      </span>
                      <span className='text-muted-foreground/80 max-w-50 text-[11px] leading-tight'>
                        {activeFile.disk === 'local'
                          ? t('files.disk.localTooltip')
                          : t('files.disk.publicTooltip')}
                      </span>
                    </div>

                    {canUpdate ? (
                      <div className='flex items-center gap-1.5'>
                        {updateDiskMutation.isPending && (
                          <Loader2 className='text-muted-foreground size-3.5 animate-spin' />
                        )}
                        <Select
                          value={activeFile.disk ?? 'public'}
                          onValueChange={(val: 'public' | 'local') =>
                            updateDiskMutation.mutate(val)
                          }
                          disabled={updateDiskMutation.isPending}
                        >
                          <SelectTrigger className='h-8 w-30 text-xs'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='public' className='text-xs'>
                              <div className='flex items-center gap-1.5'>
                                <Globe className='size-3.5 text-blue-500' />
                                <span>{t('files.disk.public')}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value='local' className='text-xs'>
                              <div className='flex items-center gap-1.5'>
                                <Lock className='size-3.5 text-amber-500' />
                                <span>{t('files.disk.local')}</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <span className='font-medium capitalize'>
                        {activeFile.disk === 'local'
                          ? t('files.disk.local')
                          : t('files.disk.public')}
                      </span>
                    )}
                  </div>

                  {activeFile.width && activeFile.height && (
                    <>
                      <Separator />
                      <div className='flex items-center justify-between py-1'>
                        <span className='text-muted-foreground'>
                          {t('files.inspector.dimensions')}
                        </span>
                        <span className='text-foreground font-medium'>
                          {activeFile.width} &times; {activeFile.height} px
                        </span>
                      </div>
                    </>
                  )}

                  {activeFile.duration && (
                    <>
                      <Separator />
                      <div className='flex items-center justify-between py-1'>
                        <span className='text-muted-foreground'>Duration</span>
                        <span className='text-foreground font-medium'>
                          {activeFile.duration}s
                        </span>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className='flex items-center justify-between py-1'>
                    <span className='text-muted-foreground'>
                      {t('files.inspector.folder')}
                    </span>
                    <span className='text-foreground max-w-50 truncate font-medium'>
                      {activeFile.folder || t('files.folders.root')}
                    </span>
                  </div>

                  <Separator />

                  <div className='flex items-center justify-between py-1'>
                    <span className='text-muted-foreground'>
                      {t('files.inspector.uploaded')}
                    </span>
                    <span className='text-foreground font-medium'>
                      {format(new Date(activeFile.createdAt), 'PPpp')}
                    </span>
                  </div>

                  <Separator />

                  <div className='flex items-center justify-between py-1'>
                    <span className='text-muted-foreground'>Public ID</span>
                    <span className='text-muted-foreground max-w-45 truncate font-mono text-[11px]'>
                      {activeFile.public_id}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
