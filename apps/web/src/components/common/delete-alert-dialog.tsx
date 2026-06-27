import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteAlertDialogProps {
  handleDelete: () => void
  isLoading: boolean
  title?: string
  description?: string
  translationValues?: Record<string, string>
  confirmText?: string
  cancelText?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteAlertDialog({
  handleDelete,
  isLoading,
  title = 'common.popup.deleteTitle',
  description = 'common.popup.deleteDescription',
  translationValues,
  confirmText = 'buttons.delete',
  cancelText = 'buttons.cancel',
  open,
  onOpenChange,
}: DeleteAlertDialogProps) {
  const { t } = useTranslation()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t(title as any, translationValues)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(description as any, translationValues)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {t(cancelText as any) ?? t('buttons.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant='destructive'
            onClick={handleDelete}
            disabled={isLoading}
          >
            {t(confirmText as any) ?? t('buttons.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
