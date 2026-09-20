import { useState } from 'react'
import { format } from 'date-fns'
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  FileIcon,
  HardDrive,
  Info,
  MoveRight,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import type { FileSchema } from '../schema'

interface FileInspectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileSchema | null
  onPreview: (file: FileSchema) => void
  onCopyUrl: (file: FileSchema) => void
  onMove: (file: FileSchema) => void
  onDelete: (file: FileSchema) => void
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
  canUpdate,
  canDelete,
}: FileInspectorProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!file) return
    await onCopyUrl(file)
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

        {!file ? (
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
                onClick={() => onPreview(file)}
              >
                {isPreviewableImage(file) ||
                isPreviewableVideo(file) ||
                isPreviewableAudio(file) ? (
                  <FilePreviewThumbnail
                    file={file}
                    className='size-full object-contain transition-transform duration-200 group-hover:scale-105'
                  />
                ) : (
                  <div className='flex flex-col items-center gap-2 p-6'>
                    <FileIcon className='text-muted-foreground size-12' />
                    <span className='text-muted-foreground text-xs font-medium uppercase'>
                      {file.mime}
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
                      onPreview(file)
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
                  {file.original_name}
                </h3>
                <div className='flex flex-wrap items-center gap-1.5'>
                  <Badge variant='outline' className='text-xs uppercase'>
                    {file.resource_type}
                  </Badge>
                  <Badge
                    variant={file.status === 'active' ? 'secondary' : 'outline'}
                    className='text-xs capitalize'
                  >
                    {file.status}
                  </Badge>
                  {file.disk && (
                    <Badge variant='outline' className='text-xs'>
                      <HardDrive className='mr-1 size-3' />
                      {file.disk}
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
                  onClick={() => onPreview(file)}
                  className='h-9 justify-center gap-2'
                >
                  <Eye className='size-4' />
                  <span>{t('files.actions.preview')}</span>
                </Button>

                {canUpdate && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => onMove(file)}
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
                    onClick={() => onDelete(file)}
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
                      {formatBytes(file.size)} ({file.size.toLocaleString()} B)
                    </span>
                  </div>

                  <Separator />

                  <div className='flex items-center justify-between py-1'>
                    <span className='text-muted-foreground'>
                      {t('files.inspector.mime')}
                    </span>
                    <span className='text-foreground max-w-50 truncate font-mono font-medium'>
                      {file.mime}
                    </span>
                  </div>

                  {file.width && file.height && (
                    <>
                      <Separator />
                      <div className='flex items-center justify-between py-1'>
                        <span className='text-muted-foreground'>
                          {t('files.inspector.dimensions')}
                        </span>
                        <span className='text-foreground font-medium'>
                          {file.width} &times; {file.height} px
                        </span>
                      </div>
                    </>
                  )}

                  {file.duration && (
                    <>
                      <Separator />
                      <div className='flex items-center justify-between py-1'>
                        <span className='text-muted-foreground'>Duration</span>
                        <span className='text-foreground font-medium'>
                          {file.duration}s
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
                      {file.folder || t('files.folders.root')}
                    </span>
                  </div>

                  <Separator />

                  <div className='flex items-center justify-between py-1'>
                    <span className='text-muted-foreground'>
                      {t('files.inspector.uploaded')}
                    </span>
                    <span className='text-foreground font-medium'>
                      {format(new Date(file.createdAt), 'PPpp')}
                    </span>
                  </div>

                  <Separator />

                  <div className='flex items-center justify-between py-1'>
                    <span className='text-muted-foreground'>Public ID</span>
                    <span className='text-muted-foreground max-w-45 truncate font-mono text-[11px]'>
                      {file.public_id}
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
