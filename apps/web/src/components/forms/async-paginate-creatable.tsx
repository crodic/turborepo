import { type ReactElement } from 'react'
import {
  classNamesSelect,
  componentsSelect,
  stylesSelect,
  themeSelect,
} from '@/styles/styles-config'
import type { GroupBase } from 'react-select'
import { withAsyncPaginate } from 'react-select-async-paginate'
import type {
  UseAsyncPaginateParams,
  ComponentProps,
} from 'react-select-async-paginate'
import Creatable from 'react-select/creatable'
import type { CreatableProps } from 'react-select/creatable'
import { cn } from '@/lib/utils'

type AsyncPaginateCreatableProps<
  OptionType,
  Group extends GroupBase<OptionType>,
  Additional,
  IsMulti extends boolean,
> = CreatableProps<OptionType, IsMulti, Group> &
  UseAsyncPaginateParams<OptionType, Group, Additional> &
  ComponentProps<OptionType, Group, IsMulti>

type AsyncPaginateCreatableType = <
  OptionType,
  Group extends GroupBase<OptionType>,
  Additional,
  IsMulti extends boolean = false,
>(
  props: AsyncPaginateCreatableProps<OptionType, Group, Additional, IsMulti>
) => ReactElement

const AsyncPaginateCreatable = withAsyncPaginate(
  Creatable
) as AsyncPaginateCreatableType

export type OptionValue = string | number | boolean

export interface Option {
  id: OptionValue
  name: string
  data?: Record<string, unknown>
}

// ===== TYPES =====
type IsMulti = boolean

type AsyncCreatableSelectProps<Additional = unknown> = React.ComponentProps<
  typeof AsyncPaginateCreatable<Option, GroupBase<Option>, Additional, IsMulti>
>

function AsyncCreatableSelect<Additional = unknown>({
  className,
  ...props
}: AsyncCreatableSelectProps<Additional>): ReactElement {
  return (
    <AsyncPaginateCreatable
      className={cn('w-full', className)}
      styles={stylesSelect}
      classNames={classNamesSelect}
      theme={themeSelect}
      components={componentsSelect}
      getOptionLabel={(option) => option.name}
      getOptionValue={(option) => String(option.id)}
      {...props}
    />
  )
}

export default AsyncCreatableSelect
