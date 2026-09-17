import { useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
  onOpenChange: (open: boolean) => void
  onSubmit: (folder: string) => Promise<void>
}

export function FolderDialog({
  open,
  title,
  submitLabel,
  defaultValue = '',
  onOpenChange,
  onSubmit,
}: FolderDialogProps) {
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
