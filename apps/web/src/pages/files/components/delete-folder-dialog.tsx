import { useTranslation } from 'react-i18next'
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

export interface DeleteFolderDialogProps {
  folder: string | null
  deleteFiles: boolean
  isLoading: boolean
  onDeleteFilesChange: (checked: boolean) => void
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteFolderDialog({
  folder,
  deleteFiles,
  isLoading,
  onDeleteFilesChange,
  onOpenChange,
  onConfirm,
}: DeleteFolderDialogProps) {
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
