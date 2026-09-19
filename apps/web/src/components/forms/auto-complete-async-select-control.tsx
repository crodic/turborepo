import {
  forwardRef,
  useCallback,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
} from 'react'
import { useFormContext } from 'react-hook-form'
import type { MultiValue, OnChangeValue, SingleValue } from 'react-select'
import {
  AutoCompleteAsyncSelect,
  type OptionType,
  type OptionValue,
} from '@/components/auto-complete-async-select'

export interface AutoCompleteAsyncSelectControlProps<
  TOption extends OptionType = OptionType,
> extends Omit<
  ComponentPropsWithoutRef<typeof AutoCompleteAsyncSelect<TOption>>,
  'value' | 'onChange'
> {
  name?: string
  /**
   * Form-managed value: primitive ID, array of IDs, or full OptionType object.
   */
  value?: OptionValue | OptionValue[] | TOption | TOption[] | null
  /**
   * Callback fired when value changes, passing primitive ID or array of IDs.
   */
  onChange?: (value: OptionValue | OptionValue[] | undefined) => void
  /**
   * Callback fired when option is selected, providing the full option object.
   */
  onSelectOption?: (option: TOption | TOption[] | null) => void
  /**
   * Initial option for edit mode when options list is not yet loaded.
   * Example: defaultOption={city?.country ? { value: city.country.id, label: city.country.name } : undefined}
   */
  defaultOption?: TOption | TOption[] | null
}

export const AutoCompleteAsyncSelectControl = forwardRef<
  any,
  AutoCompleteAsyncSelectControlProps
>(
  (
    { onChange, onSelectOption, value, name, defaultOption, isMulti, ...props },
    ref
  ) => {
    const form = useFormContext()

    // Track the user-selected option object to retain label display
    const [currentSelectedOption, setCurrentSelectedOption] = useState<
      OptionType | OptionType[] | null
    >(null)

    const selectedOption = useMemo(() => {
      if (value == null || value === '') return null

      // Value is already an option object
      if (typeof value === 'object') {
        return value as any
      }

      // Match against recently selected option
      if (currentSelectedOption) {
        if (
          isMulti &&
          Array.isArray(currentSelectedOption) &&
          Array.isArray(value)
        ) {
          const matches = currentSelectedOption.filter((opt) =>
            value.some(
              (v) => String(v) === String(opt.value ?? (opt as any).id)
            )
          )
          if (matches.length > 0) return matches
        } else if (!isMulti && !Array.isArray(currentSelectedOption)) {
          const optVal =
            currentSelectedOption.value ?? (currentSelectedOption as any).id
          if (String(optVal) === String(value)) {
            return currentSelectedOption
          }
        }
      }

      // Match against defaultOption provided for edit mode
      if (defaultOption) {
        if (isMulti && Array.isArray(defaultOption) && Array.isArray(value)) {
          return defaultOption.filter((opt) =>
            value.some(
              (v) => String(v) === String(opt.value ?? (opt as any).id)
            )
          )
        } else if (!isMulti && !Array.isArray(defaultOption)) {
          const optVal = defaultOption.value ?? (defaultOption as any).id
          if (String(optVal) === String(value)) {
            return defaultOption
          }
        }
      }

      // Fallback: render placeholder label with the primitive value
      return isMulti
        ? (Array.isArray(value) ? value : [value]).map((v) => ({
            value: v as OptionValue,
            label: String(v),
          }))
        : {
            value: value as OptionValue,
            label: String(value),
          }
    }, [value, currentSelectedOption, defaultOption, isMulti])

    const handleOnChange = useCallback(
      (v: OnChangeValue<OptionType, boolean>) => {
        setCurrentSelectedOption(v as any)
        onSelectOption?.(v as any)

        if (v == null && name != null && form) {
          onChange?.(undefined)
          form.resetField(name, { defaultValue: null })
          return
        }

        if (Array.isArray(v)) {
          const ids = (v as MultiValue<OptionType>).map(
            (i) => i.value ?? (i as any).id
          )
          onChange?.(ids)
        } else {
          const single = v as SingleValue<OptionType>
          const id = single?.value ?? (single as any)?.id ?? undefined
          onChange?.(id)
        }
      },
      [form, name, onChange, onSelectOption]
    )

    return (
      <AutoCompleteAsyncSelect
        selectRef={ref}
        isMulti={isMulti as any}
        value={selectedOption as any}
        onChange={handleOnChange as any}
        {...props}
      />
    )
  }
)

AutoCompleteAsyncSelectControl.displayName = 'AutoCompleteAsyncSelectControl'

export default AutoCompleteAsyncSelectControl
