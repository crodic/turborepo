import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'

export function NotFoundError() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>404</h1>
        <span className='font-medium'>{t('errors.notFound.title')}</span>
        <p className='text-muted-foreground text-center'>
          {t('errors.notFound.description')}
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={() => navigate(-1)}>
            {t('errors.common.goBack')}
          </Button>
          <Button onClick={() => navigate('/')}>
            {t('errors.common.backHome')}
          </Button>
        </div>
      </div>
    </div>
  )
}
