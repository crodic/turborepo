import { forwardRef } from 'react'
import {
  classNamesSelect,
  componentsSelect,
  stylesSelect,
  themeSelect,
} from '@/styles/styles-config'
import { ChevronDownIcon, X } from 'lucide-react'
import Select, {
  type ClearIndicatorProps,
  type DropdownIndicatorProps,
  type GroupBase,
  components,
} from 'react-select'
import { cn } from '@/lib/utils'

export function DropdownIndicator<
  Option = unknown,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>({ ...props }: DropdownIndicatorProps<Option, IsMulti, Group>) {
  return (
    <components.DropdownIndicator {...props}>
      <ChevronDownIcon size={18} />
    </components.DropdownIndicator>
  )
}

export function ClearIndicator<
  Option = unknown,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>({ ...props }: ClearIndicatorProps<Option, IsMulti, Group>) {
  return (
    <components.ClearIndicator {...props}>
      <X size={15} />
    </components.ClearIndicator>
  )
}

export type OptionValue = string | number | boolean

export interface Option {
  id: OptionValue
  name: string
}

type IsMulti = boolean

const AutoCompleteSelect = forwardRef<
  React.ElementRef<typeof Select<Option, IsMulti>>,
  React.ComponentPropsWithoutRef<typeof Select<Option, IsMulti>>
>(({ className, ...props }, ref) => (
  <Select
    ref={ref}
    className={cn('w-full', className)}
    styles={stylesSelect}
    classNames={classNamesSelect}
    theme={themeSelect}
    components={componentsSelect}
    getOptionLabel={(option) => option.name}
    getOptionValue={(option) => String(option.id)}
    {...props}
  />
))

export default AutoCompleteSelect
