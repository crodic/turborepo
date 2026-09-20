import { format } from 'date-fns'
import {
  Calendar,
  Clock,
  ExternalLink,
  Folder,
  HardDrive,
  Maximize2,
  Tag,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatBytes } from '../columns'
import { type FileSchema } from '../schema'

export interface FileMetadataViewProps {
  file: FileSchema
  previewOpenUrl?: string
}

export function FileMetadataView({
  file,
  previewOpenUrl,
}: FileMetadataViewProps) {
  const { t } = useTranslation()

  return (
    <div className='flex flex-col gap-4'>
      {/* File Info Card */}
      <div className='border-border/60 bg-muted/20 space-y-3 rounded-xl border p-3.5 shadow-xs'>
        <p className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
          {t('files.inspector.information', 'File Details')}
        </p>
        <div className='space-y-2.5 text-xs'>
          <div className='flex items-center justify-between gap-2'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              <Folder className='size-3.5' />
              {t('files.table.folder')}
            </span>
            <Badge
              variant='secondary'
              className='max-w-42.5 truncate text-[11px] font-normal'
            >
              {file.folder ?? t('files.folders.root')}
            </Badge>
          </div>

          <div className='flex items-center justify-between gap-2'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              <Tag className='size-3.5' />
              {t('files.table.mime')}
            </span>
            <code className='bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[11px]'>
              {file.mime}
            </code>
          </div>

          <div className='flex items-center justify-between gap-2'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              <HardDrive className='size-3.5' />
              {t('files.table.size')}
            </span>
            <span className='text-foreground font-semibold'>
              {formatBytes(file.size)}
            </span>
          </div>

          {(file.width || file.height) && (
            <div className='flex items-center justify-between gap-2'>
              <span className='text-muted-foreground flex items-center gap-1.5'>
                <Maximize2 className='size-3.5' />
                {t('files.table.dimensions')}
              </span>
              <span className='text-foreground font-mono font-medium'>
                {file.width} × {file.height}
              </span>
            </div>
          )}

          {Boolean(file.duration) && (
            <div className='flex items-center justify-between gap-2'>
              <span className='text-muted-foreground flex items-center gap-1.5'>
                <Clock className='size-3.5' />
                {t('files.inspector.duration', 'Duration')}
              </span>
              <span className='text-foreground font-mono font-medium'>
                {Math.floor(file.duration! / 60)}:
                {String(Math.floor(file.duration! % 60)).padStart(2, '0')}
              </span>
            </div>
          )}

          <div className='flex items-center justify-between gap-2'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              {t('files.table.status', 'Status')}
            </span>
            <div className='flex items-center gap-1.5'>
              <span
                className={cn(
                  'size-2 rounded-full',
                  file.status === 'active'
                    ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-amber-500 ring-2 ring-amber-500/20'
                )}
              />
              <span className='text-foreground font-medium capitalize'>
                {file.status}
              </span>
            </div>
          </div>

          {file.disk && (
            <div className='flex items-center justify-between gap-2'>
              <span className='text-muted-foreground flex items-center gap-1.5'>
                {t('files.inspector.disk', 'Storage')}
              </span>
              <Badge
                variant='outline'
                className='font-mono text-[10px] uppercase'
              >
                {file.disk}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Dates Card */}
      <div className='border-border/60 bg-muted/20 space-y-2.5 rounded-xl border p-3.5 text-xs shadow-xs'>
        <div className='flex items-center justify-between gap-2'>
          <span className='text-muted-foreground flex items-center gap-1.5'>
            <Calendar className='size-3.5' />
            {t('files.table.createdAt')}
          </span>
          <span className='text-foreground font-medium'>
            {format(new Date(file.createdAt), 'dd/MM/yyyy HH:mm')}
          </span>
        </div>
        {file.updatedAt && (
          <div className='flex items-center justify-between gap-2'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              <Clock className='size-3.5' />
              {t('files.table.updatedAt', 'Updated')}
            </span>
            <span className='text-foreground font-medium'>
              {format(new Date(file.updatedAt), 'dd/MM/yyyy HH:mm')}
            </span>
          </div>
        )}
      </div>

      {/* Action Links */}
      <div className='flex flex-col gap-2'>
        <Button
          variant='outline'
          size='sm'
          className='w-full justify-start text-xs'
          asChild
        >
          <a href={previewOpenUrl} target='_blank' rel='noreferrer'>
            <ExternalLink className='mr-2 size-3.5' />
            {t('files.actions.open')}
          </a>
        </Button>
      </div>
    </div>
  )
}
