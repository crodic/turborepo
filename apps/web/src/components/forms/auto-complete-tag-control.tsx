'use client'

import {
  type ComponentPropsWithRef,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useFormContext } from 'react-hook-form'
import {
  classNamesSelect,
  componentsSelect,
  stylesSelect,
  themeSelect,
} from '@/styles/styles-config'
import Fuse from 'fuse.js'
import Select, {
  type MultiValue,
  type OnChangeValue,
  type SingleValue,
} from 'react-select'
import CreatableSelect from 'react-select/creatable'
import { Input } from '../ui/input'

export type OptionValue = string | number | boolean

export interface Option {
  id: OptionValue
  name: string
  value?: OptionValue
}

interface SelectOption {
  value: OptionValue
  label: string
}

const convertToSelectOption = (option: Option): SelectOption => ({
  value: option.id,
  label: option.name,
})

type SelectProps = ComponentPropsWithRef<typeof Select<SelectOption, boolean>>

type Props = Omit<SelectProps, 'options' | 'value' | 'onChange'> & {
  value: OptionValue | OptionValue[] | null | undefined
  onChange: (value: OptionValue | OptionValue[] | undefined) => void

  options?: Option[]
  onSearch?: (keyword: string) => Promise<Option[]>

  onCreateOption?: (
    inputValue: string
  ) => Promise<Option[] | Option> | Option[] | Option
  defaultOptions?: Option[]
}

const AutoCompleteTagControl = ({
  onChange,
  value,
  name,
  options = [],
  onSearch,
  onCreateOption,
  isMulti = false,
  isLoading = false,
  ref,
  defaultOptions = [],
  ...props
}: Props) => {
  const form = useFormContext()

  const [inputValue, setInputValue] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const [remoteOptions, setRemoteOptions] = useState<SelectOption[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [createdOptions, setCreatedOptions] = useState<Option[]>([])

  const debounceRef = useRef<number | null>(null)

  // ================= SEARCH =================
  const handleSearch = useCallback(
    (keyword: string) => {
      if (!onSearch) return

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      if (!keyword.trim()) {
        setRemoteOptions([])
        return
      }

      debounceRef.current = window.setTimeout(async () => {
        try {
          setSearchLoading(true)
          const data = await onSearch(keyword)
          setRemoteOptions(data.map(convertToSelectOption))
        } finally {
          setSearchLoading(false)
        }
      }, 400)
    },
    [onSearch]
  )

  // ================= LOCAL SEARCH =================
  const fuse = useMemo(() => {
    return new Fuse(options, {
      keys: ['name'],
      threshold: 0.6,
    })
  }, [options])

  const filteredOptions = useMemo(() => {
    if (onSearch) return []

    if (!inputValue) {
      return options.slice(0, 20).map(convertToSelectOption)
    }

    return fuse
      .search(inputValue)
      .slice(0, 20)
      .map((r) => convertToSelectOption(r.item))
  }, [options, inputValue, fuse, onSearch])

  const selectedValue = useMemo(() => {
    if (value == null) return isMulti ? [] : null

    const values = Array.isArray(value) ? value : [value]

    const mergedOptions: Option[] = [
      ...defaultOptions,
      ...options,
      ...createdOptions,
      ...remoteOptions.map((o) => ({
        id: o.value,
        name: o.label,
      })),
    ]

    const mapped = values.map((v) => {
      const found = mergedOptions.find((o) => o.id === v)

      return found
        ? convertToSelectOption(found)
        : { value: v, label: String(v) }
    })

    return isMulti ? mapped : mapped[0]
  }, [value, isMulti, defaultOptions, options, createdOptions, remoteOptions])

  // ================= CHANGE =================
  const handleOnChange = useCallback(
    (v: OnChangeValue<SelectOption, boolean>) => {
      if (!v) {
        if (name) {
          form.resetField(name, {
            defaultValue: isMulti ? [] : null,
          })
        }

        onChange(isMulti ? [] : undefined)
        return
      }

      const newValue = Array.isArray(v)
        ? (v as MultiValue<SelectOption>).map((o) => o.value)
        : ((v as SingleValue<SelectOption>)?.value ?? undefined)

      onChange(newValue)
    },
    [form, name, onChange, isMulti]
  )

  // ================= CREATE =================
  const handleCreateOption = useCallback(
    async (input: string) => {
      const value = [...new Set(input.split(';').map((i) => i.trim()))]
      if (!onCreateOption) return

      try {
        setIsCreating(true)

        const result = await onCreateOption(value.join(';'))
        const newOptions = Array.isArray(result) ? result : [result]
        setCreatedOptions((prev) => [...prev, ...newOptions])

        const mapped = newOptions.map(convertToSelectOption)

        if (isMulti) {
          const current = Array.isArray(selectedValue) ? selectedValue : []
          handleOnChange([...current, ...mapped])
        } else {
          handleOnChange(mapped[0] ?? null)
        }
      } finally {
        setIsCreating(false)
      }
    },
    [onCreateOption, selectedValue, isMulti, handleOnChange]
  )

  const selectOptions = onSearch ? remoteOptions : filteredOptions

  const commonProps = {
    ref,
    value: selectedValue,
    onChange: handleOnChange,
    options: selectOptions,
    isMulti,

    isSearchable: true,
    isClearable: true,

    isLoading: isLoading || isCreating || searchLoading,
    isDisabled: isLoading || isCreating,

    styles: stylesSelect as object,
    theme: themeSelect,
    classNames: classNamesSelect,
    components: componentsSelect,

    blurInputOnSelect: false,
    autoFocus: false,

    filterOption: onSearch ? () => true : undefined,

    onInputChange: (val: string) => {
      setInputValue(val)

      if (onSearch) {
        handleSearch(val)
      }
    },

    noOptionsMessage: ({ inputValue }: { inputValue: string }) => {
      if (searchLoading) return 'Loading...'
      return inputValue.trim() === '' ? 'Type to search' : 'No results found'
    },

    ...props,
  }

  if (isLoading) {
    return (
      <Input disabled placeholder='Loading...' className='cursor-not-allowed' />
    )
  }

  if (onCreateOption) {
    return (
      <CreatableSelect<SelectOption, boolean>
        {...commonProps}
        onCreateOption={(val) => void handleCreateOption(val)}
        formatCreateLabel={(val) => `Add "${val}"`}
        isValidNewOption={(input) =>
          !searchLoading &&
          input.trim().length > 0 &&
          selectOptions.length === 0 &&
          !options.some((o) => o.name.toLowerCase() === input.toLowerCase())
        }
      />
    )
  }

  return <Select<SelectOption, boolean> {...commonProps} />
}

export default AutoCompleteTagControl
