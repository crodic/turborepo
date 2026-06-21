import { type ReactNode, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface ItemProps {
  label: string
  value?: ReactNode | string | number | null
  children?: ReactNode
}

export function DescriptionItem({ label, value, children }: ItemProps) {
  const { t } = useTranslation()
  const renderValue = useMemo(() => {
    if (children) {
      return children
    } else if (value) {
      return (
        <p className='text-secondary-foreground mt-2 text-sm font-medium break-words whitespace-pre-wrap'>
          {value}
        </p>
      )
    } else {
      return (
        <p className='text-secondary-foreground mt-2 text-sm font-normal italic'>
          {t('common.notAvailable')}
        </p>
      )
    }
  }, [value, children, t])
  return (
    <div className='p-2'>
      <p className='text-xs leading-none text-[#808080]'>{label}:</p>
      {renderValue}
    </div>
  )
}

interface LabelProps {
  label: string
}

export function DescriptionLabel({ label }: LabelProps) {
  return <p className='text-xs leading-none text-[#808080]'>{label}</p>
}

interface ValueProps {
  value?: string | number | null
  children?: ReactNode
}

export function DescriptionValue({ value, children }: ValueProps) {
  const { t } = useTranslation()

  if (children) {
    return children
  } else if (value) {
    return (
      <p className='text-secondary-foreground my-1 text-sm font-medium whitespace-pre-wrap'>
        {value}
      </p>
    )
  } else {
    return (
      <p className='text-secondary-foreground my-1 text-sm font-normal italic'>
        {t('common.notAvailable')}
      </p>
    )
  }
}

interface DetailsProps {
  children: ReactNode
}

export function Descriptions({ children }: DetailsProps) {
  return (
    <div className='gap-5 sm:grid sm:grid-cols-2 md:grid-cols-3'>
      {children}
    </div>
  )
}
