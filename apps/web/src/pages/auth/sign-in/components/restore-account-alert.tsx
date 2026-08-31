import { Loader2, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface RestoreAccountAlertProps {
  isPending: boolean
  onRestore: () => void
  onCancel: () => void
}

export function RestoreAccountAlert({
  isPending,
  onRestore,
  onCancel,
}: RestoreAccountAlertProps) {
  const { t } = useTranslation()

  return (
    <div className='bg-destructive/15 text-destructive rounded-lg border p-4 shadow-sm'>
      <div className='flex items-start gap-3'>
        <div className='flex-1 space-y-2'>
          <h4 className='font-semibold'>
            {t('auth.signIn.restoreAlertTitle')}
          </h4>
          <p className='text-sm leading-snug'>
            {t('auth.signIn.restoreAlertDesc', { date: 'soon' })}
          </p>
          <div className='flex gap-2 pt-2'>
            <Button
              size='sm'
              variant='destructive'
              onClick={onRestore}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <RotateCcw className='mr-2 h-4 w-4' />
              )}
              {t('auth.signIn.restoreButton')}
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={onCancel}
              disabled={isPending}
            >
              {t('common.actions.cancel', { defaultValue: 'Cancel' })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
