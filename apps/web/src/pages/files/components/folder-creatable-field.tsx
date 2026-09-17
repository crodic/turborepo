import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import AutoCompleteSelect, {
  type Option,
} from '@/components/forms/auto-complete-select'
import { isValidFolderName, type FolderSchema } from '../schema'

export interface FolderCreatableFieldProps {
  label: string
  value: string
  folders: FolderSchema[]
  onChange: (value: string) => void
}

export function FolderCreatableField({
  label,
  value,
  folders,
  onChange,
}: FolderCreatableFieldProps) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState('')
  const options = useMemo<Option[]>(() => {
    const baseOptions = folders.map((folder) => ({
      id: folder.folder,
      name: folder.folder,
    }))
    const normalizedInput = inputValue.trim()
    const exists = baseOptions.some(
      (option) => option.name.toLowerCase() === normalizedInput.toLowerCase()
    )

    if (!normalizedInput || exists || !isValidFolderName(normalizedInput)) {
      return baseOptions
    }

    return [
      ...baseOptions,
      {
        id: normalizedInput,
        name: t('files.folders.createOption', { folder: normalizedInput }),
      },
    ]
  }, [folders, inputValue, t])
  const selected = value ? { id: value, name: value } : null

  return (
    <div className='grid gap-2'>
      <Label>{label}</Label>
      <AutoCompleteSelect
        isClearable
        options={options}
        value={selected}
        placeholder={t('files.folders.selectPlaceholder')}
        inputValue={inputValue}
        onInputChange={(newValue, actionMeta) => {
          if (actionMeta.action === 'input-change') {
            setInputValue(newValue)
          }
        }}
        noOptionsMessage={() =>
          inputValue.trim() && !isValidFolderName(inputValue.trim())
            ? t('files.folders.invalidName')
            : t('files.folders.noOptions')
        }
        onChange={(option) => {
          if (Array.isArray(option)) {
            const nextValue = option[0] ? String(option[0].id) : ''
            onChange(nextValue && isValidFolderName(nextValue) ? nextValue : '')
            setInputValue('')
            return
          }

          const selectedOption = option as Option | null
          const nextValue = selectedOption ? String(selectedOption.id) : ''
          onChange(nextValue && isValidFolderName(nextValue) ? nextValue : '')
          setInputValue('')
        }}
      />
    </div>
  )
}
