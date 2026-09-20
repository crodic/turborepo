import { useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import { useMutation } from '@tanstack/react-query'
import { FileIcon, Loader2, Upload, Video, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { restApiErrorHandler } from '@/lib/rest-api-handler'
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

  useEffect(() => {
    if (open) {
      setTargetFolder(folder ?? '')
      setFiles(initialFiles ?? [])
      setUploadProgress({})
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
