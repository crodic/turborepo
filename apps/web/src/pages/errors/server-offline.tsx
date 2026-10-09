import { WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

type ServerOfflineProps = {
  onRetry?: () => void
  isRetrying?: boolean
  onLogout?: () => void
}

export function ServerOffline({
  onRetry,
  isRetrying,
  onLogout,
}: ServerOfflineProps) {
  const { t } = useTranslation()

  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center'>
        <div className='bg-destructive/10 text-destructive mb-2 flex size-16 items-center justify-center rounded-full'>
          <WifiOff className='size-8' />
        </div>
        <h2 className='text-2xl font-bold tracking-tight'>
          {t('errors.general.title')}
        </h2>
        <p className='text-muted-foreground max-w-md text-sm'>
          {t('errors.general.description')}
        </p>
        <div className='mt-6 flex gap-4'>
          {onRetry && (
            <Button variant='outline' disabled={isRetrying} onClick={onRetry}>
              {isRetrying ? t('common.loading') : t('common.refresh')}
            </Button>
          )}
          {onLogout && (
            <Button variant='destructive' onClick={onLogout}>
              {t('common.logout')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
