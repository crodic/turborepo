import { useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { restApiErrorHandler } from '@/lib/rest-api-handler'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isValidFolderName } from '../schema'

export interface FolderDialogProps {
  open: boolean
  title: string
  submitLabel: string
  defaultValue?: string
  existingFolders?: string[]
  onOpenChange: (open: boolean) => void
  onSubmit: (folder: string) => Promise<void>
}

export function FolderDialog({
  open,
  title,
  submitLabel,
  defaultValue = '',
  existingFolders,
  onOpenChange,
  onSubmit,
}: FolderDialogProps) {
  const { t } = useTranslation()
  const [folder, setFolder] = useState(defaultValue)
  const normalizedFolder = folder.trim()

  const isDuplicate =
    Boolean(normalizedFolder) &&
    Boolean(
      existingFolders?.some(
        (f) =>
          f.toLowerCase() === normalizedFolder.toLowerCase() &&
          f.toLowerCase() !== defaultValue.trim().toLowerCase()
      )
    )

  const folderError =
    normalizedFolder && !isValidFolderName(normalizedFolder)
      ? t('files.folders.invalidName')
      : isDuplicate
        ? t('files.folders.alreadyExists')
        : null

  const mutation = useMutation({
    mutationFn: () => onSubmit(normalizedFolder),
    onSuccess: () => {
      setFolder('')
      onOpenChange(false)
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        restApiErrorHandler(error)
        return
      }

      toast.error(error instanceof Error ? error.message : 'Error')
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
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                normalizedFolder &&
                !folderError &&
                !mutation.isPending
              ) {
                e.preventDefault()
                mutation.mutate()
              }
            }}
          />
          {folderError && (
            <p className='text-destructive text-sm'>{folderError}</p>
          )}
          {mutation.error && (
            <p className='text-destructive text-sm'>
              {mutation.error instanceof AxiosError
                ? (mutation.error.response?.data?.message ??
                  mutation.error.message)
                : mutation.error instanceof Error
                  ? mutation.error.message
                  : String(mutation.error)}
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
