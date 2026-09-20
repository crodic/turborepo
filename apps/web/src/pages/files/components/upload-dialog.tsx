import { useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import { useMutation } from '@tanstack/react-query'
import { FileIcon, Loader2, Upload, Video, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { restApiErrorHandler } from '@/lib/rest-api-handler'
import { cn } from '@/lib/utils'
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
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatBytes } from '../columns'
import { apiUploadFile, MANAGED_FILE_UPLOAD_MAX_SIZE } from '../queries'
import { type FolderSchema } from '../schema'
import { FolderCreatableField } from './folder-creatable-field'

export interface UploadDialogProps {
  open: boolean
  folder: string | null
  folders: FolderSchema[]
  initialFiles?: File[]
  onOpenChange: (open: boolean) => void
  onUploaded: () => Promise<void>
  onCreateLocalFolder: (folder: string) => void
}

export function getLocalUploadKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

export function UploadDialog({
  open,
  folder,
  folders,
  initialFiles,
  onOpenChange,
  onUploaded,
  onCreateLocalFolder,
}: UploadDialogProps) {
  const { t } = useTranslation()
  const [targetFolder, setTargetFolder] = useState(folder ?? '')
  const [targetDisk, setTargetDisk] = useState<'local' | 'public'>('public')
  const [files, setFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  )
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    if (open) {
      setTargetFolder(folder ?? '')
      setFiles(initialFiles ?? [])
      setUploadProgress({})
      setIsDragOver(false)
    }
  }, [open, folder, initialFiles])

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
      <DialogContent className='flex max-h-[calc(100vh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[min(88vh,42rem)] sm:max-w-lg'>
        <DialogHeader className='shrink-0 border-b p-6 pr-12 pb-4 text-left'>
          <DialogTitle>{t('files.upload.title')}</DialogTitle>
          <DialogDescription className='mt-1 text-xs sm:text-sm'>
            {t('files.upload.description')}
          </DialogDescription>
        </DialogHeader>
        <div className='min-h-0 flex-1 space-y-4 overflow-y-auto p-6'>
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
          <label
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDragOver(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDragOver(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDragOver(false)
              if (e.dataTransfer.files?.length) {
                setFiles((current) => [
                  ...current,
                  ...Array.from(e.dataTransfer.files),
                ])
              }
            }}
            className={cn(
              'border-border hover:bg-muted/40 flex cursor-pointer items-center justify-center rounded-lg border border-dashed transition-all',
              isDragOver &&
                'border-primary bg-primary/5 ring-primary/20 ring-2',
              files.length > 0
                ? 'flex-row gap-3 p-3.5'
                : 'flex-col gap-2 p-8 text-center'
            )}
          >
            <Upload
              className={cn(
                'text-muted-foreground shrink-0',
                files.length > 0 ? 'size-5' : 'size-8'
              )}
            />
            <div className={files.length > 0 ? 'min-w-0 flex-1' : ''}>
              <span className='text-sm font-medium'>
                {t('files.upload.pickFiles')}
              </span>
              {files.length > 0 ? (
                <span className='text-muted-foreground ml-2 text-xs'>
                  ({t('files.upload.selected', { count: files.length })})
                </span>
              ) : (
                <p className='text-muted-foreground mt-1 text-xs'>
                  {t('files.upload.empty')}
                </p>
              )}
            </div>
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
            <div className='flex flex-col gap-1.5'>
              <div className='text-muted-foreground flex items-center justify-between px-0.5 text-xs'>
                <span>
                  {t('files.upload.selected', { count: files.length })}
                </span>
                <button
                  type='button'
                  onClick={() => setFiles([])}
                  className='hover:text-destructive text-xs transition-colors'
                  disabled={uploadMutation.isPending}
                >
                  {t('dataTable.filter.clear', 'Clear')}
                </button>
              </div>
              <ScrollArea className='max-h-52 rounded-md border'>
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
            </div>
          )}
          {uploadMutation.error instanceof AxiosError && (
            <p className='text-destructive text-sm'>
              {uploadMutation.error.response?.data.message ??
                uploadMutation.error.message}
            </p>
          )}
        </div>
        <DialogFooter className='bg-background/50 flex shrink-0 flex-row justify-end gap-2 border-t p-4 px-6'>
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

export function UploadFilePreview({
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
