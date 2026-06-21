import { US, VN } from 'country-flag-icons/react/3x2'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const LanguageSelect = () => {
  const { i18n } = useTranslation()
  const { t } = useTranslation()

  return (
    <Select
      defaultValue={i18n.language || 'en'}
      onValueChange={(value) => i18n.changeLanguage(value)}
    >
      <SelectTrigger className='flex min-w-62.5'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='en'>
          <div className='flex items-center gap-2'>
            <US title='United States' className='size-4' />
            <p>{t('config.language.english')}</p>
          </div>
        </SelectItem>
        <SelectItem value='vi'>
          <div className='flex items-center gap-2'>
            <VN title='Vietnamese' className='size-4' />
            <p>{t('config.language.vietnamese')}</p>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

export default LanguageSelect
