import { forwardRef, useEffect, useRef } from 'react'
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
  type MenuListProps,
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

export function MenuList<
  Option = unknown,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>(props: MenuListProps<Option, IsMulti, Group>) {
  const localRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = localRef.current
    if (!el) return

    const stopPropagation = (e: Event) => {
      e.stopPropagation()
    }

    el.addEventListener('wheel', stopPropagation)
    el.addEventListener('touchmove', stopPropagation)

    return () => {
      el.removeEventListener('wheel', stopPropagation)
      el.removeEventListener('touchmove', stopPropagation)
    }
  }, [])

  return (
    <components.MenuList
      {...props}
      innerRef={(node) => {
        localRef.current = node
        if (typeof props.innerRef === 'function') {
          props.innerRef(node)
        } else if (props.innerRef) {
          ;(
            props.innerRef as React.MutableRefObject<HTMLDivElement | null>
          ).current = node
        }
      }}
    />
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
>(({ className, components: userComponents, ...props }, ref) => (
  <Select
    ref={ref}
    className={cn('w-full', className)}
    styles={stylesSelect}
    classNames={classNamesSelect}
    theme={themeSelect}
    components={{
      ...componentsSelect,
      MenuList,
      ...userComponents,
    }}
    menuPortalTarget={
      props.menuPortalTarget ??
      (typeof document !== 'undefined' ? document.body : null)
    }
    menuPosition={props.menuPosition ?? 'fixed'}
    menuShouldBlockScroll={false}
    getOptionLabel={(option) => option.name}
    getOptionValue={(option) => String(option.id)}
    {...props}
  />
))

export default AutoCompleteSelect
