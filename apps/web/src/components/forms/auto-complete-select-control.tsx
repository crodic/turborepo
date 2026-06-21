import {
  type ComponentPropsWithoutRef,
  type ElementRef,
  forwardRef,
  useCallback,
  useMemo,
} from 'react'
import { useFormContext } from 'react-hook-form'
import type {
  MultiValue,
  OnChangeValue,
  PropsValue,
  SingleValue,
} from 'react-select'
import AutoCompleteSelect, {
  type Option,
  type OptionValue,
} from './auto-complete-select'

type IsMulti = boolean
type AutoCompleteSelectControlForwardRef = Omit<
  ComponentPropsWithoutRef<typeof AutoCompleteSelect>,
  'onChange' | 'value'
> & {
  value: OptionValue | OptionValue[] | null | undefined
  onChange: (value: OptionValue | OptionValue[] | undefined) => void
}

const AutoCompleteSelectControl = forwardRef<
  ElementRef<typeof AutoCompleteSelect>,
  AutoCompleteSelectControlForwardRef
>(({ onChange, value, name, ...props }, ref) => {
  const { isMulti, options } = props
  const selectedValue = useMemo(() => {
    if (options == null || value == null) {
      return undefined
    }

    let _value = undefined
    if (isMulti) {
      _value = options.filter((i) =>
        (value as OptionValue[]).includes((i as Option).id)
      )
    } else {
      _value = options.find((i) => (i as Option).id == value) ?? null
    }

    return _value as PropsValue<Option>
  }, [isMulti, options, value])

  const form = useFormContext()
  const handleOnChange = useCallback(
    (v: OnChangeValue<Option, IsMulti>) => {
      if (v == null && name != null) {
        onChange(undefined)
        form.resetField(name, { defaultValue: null })
        return
      }

      let _value: OptionValue | OptionValue[] | undefined = undefined
      if (Array.isArray(v)) {
        _value = (v as MultiValue<Option>).map((i) => i.id)
      } else {
        _value = (v as SingleValue<Option>)?.id ?? undefined
      }
      onChange(_value)
    },
    [form, name, onChange]
  )

  return (
    <AutoCompleteSelect
      ref={ref}
      isSearchable={true}
      isClearable={true}
      value={selectedValue}
      onChange={handleOnChange}
      {...props}
    />
  )
})

export default AutoCompleteSelectControl
