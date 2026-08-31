import { useTranslation } from 'react-i18next'
import { useNavigate, useRouteError } from 'react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

type GeneralErrorProps = React.HTMLAttributes<HTMLDivElement> & {
  minimal?: boolean
}

export function GeneralError({
  className,
  minimal = false,
}: GeneralErrorProps) {
  const { t } = useTranslation()
  const error = useRouteError() as {
    statusText: string | null
    message: string | null
  } & Error

  const errorMessage = [error.statusText, error.message]
    .filter((i) => i != null && i.length > 0)
    .join(':')

  const navigate = useNavigate()
  return (
    <div className={cn('h-svh w-full', className)}>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        {!minimal && (
          <h1 className='text-[7rem] leading-tight font-bold'>500</h1>
        )}
        <span className='font-medium'>{t('errors.general.title')}</span>
        <p className='text-muted-foreground text-center'>
          {t('errors.general.description')}
        </p>
        <p className='text-center text-red-600'>{errorMessage}</p>
        <Collapsible className='text-gray-400'>
          <CollapsibleTrigger>
            <i>{t('errors.general.seeMore')}</i>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre>{error.stack}</pre>
          </CollapsibleContent>
        </Collapsible>
        {!minimal && (
          <div className='mt-6 flex gap-4'>
            <Button variant='outline' onClick={() => navigate(-1)}>
              {t('errors.common.goBack')}
            </Button>
            <Button onClick={() => navigate('/')}>
              {t('errors.common.backHome')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
