import type { ComponentPropsWithoutRef, ReactElement } from 'react'
import { classNamesSelect, themeSelect } from '@/styles/styles-config'
import type { GroupBase } from 'react-select'
import { AsyncPaginate, withAsyncPaginate } from 'react-select-async-paginate'
import type {
  UseAsyncPaginateParams,
  ComponentProps,
} from 'react-select-async-paginate'
import Creatable from 'react-select/creatable'
import type { CreatableProps } from 'react-select/creatable'

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

export type OptionType = {
  value: number
  label: string
}

const AsyncPaginateCreatable = withAsyncPaginate(
  Creatable
) as AsyncPaginateCreatableType

const AutoCompleteAsyncSelect = (
  props: ComponentPropsWithoutRef<typeof AsyncPaginate>
) => {
  return (
    <AsyncPaginate
      theme={themeSelect}
      classNames={classNamesSelect}
      debounceTimeout={500}
      isClearable={true}
      {...props}
    />
  )
}

export default {
  Creatable: AsyncPaginateCreatable,
  Default: AutoCompleteAsyncSelect,
}
