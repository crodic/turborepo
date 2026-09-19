import {
  useCallback,
  type ComponentPropsWithoutRef,
  type ReactElement,
} from 'react'
import {
  classNamesSelect,
  componentsSelect,
  stylesSelect,
  themeSelect,
} from '@/styles/styles-config'
import type { GroupBase, OptionsOrGroups } from 'react-select'
import {
  AsyncPaginate,
  withAsyncPaginate,
  type UseAsyncPaginateParams,
  type ComponentProps,
} from 'react-select-async-paginate'
import Creatable from 'react-select/creatable'
import type { CreatableProps } from 'react-select/creatable'
import { cn } from '@/lib/utils'

// ===== TYPES =====
export type OptionValue = string | number | boolean

export type OptionType = {
  value: OptionValue
  label: string
  [key: string]: unknown
}

export type PaginationAdditional = {
  page: number
}

export type AsyncFetchResponse<TOption> =
  | {
      data: TOption[]
      hasMore?: boolean
      totalPages?: number
    }
  | {
      options: TOption[]
      hasMore?: boolean
      totalPages?: number
    }

export type FetchOptionsFn<TOption> = (
  search: string,
  page: number
) => Promise<AsyncFetchResponse<TOption>>

// ===== ASYNC CREATABLE COMPONENT DEFINITION =====
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

export const AsyncPaginateCreatable = withAsyncPaginate(
  Creatable
) as AsyncPaginateCreatableType

// ===== MAIN SELECT PROPS =====
export interface AutoCompleteAsyncSelectProps<
  TOption = OptionType,
  TGroup extends GroupBase<TOption> = GroupBase<TOption>,
  TAdditional = PaginationAdditional,
  TIsMulti extends boolean = false,
> extends Omit<
  ComponentPropsWithoutRef<
    typeof AsyncPaginate<TOption, TGroup, TAdditional, TIsMulti>
  >,
  'loadOptions'
> {
  /**
   * Helper function for paginated data loading: receives (search, page) and returns { data, hasMore }.
   * Automatically manages { page: 1 } and increments pages internally.
   */
  fetchOptions?: FetchOptionsFn<TOption>
  /**
   * Raw loadOptions function from react-select-async-paginate for advanced use cases.
   */
  loadOptions?: (
    search: string,
    loadedOptions: OptionsOrGroups<TOption, TGroup>,
    additional?: TAdditional
  ) => Promise<{
    options: OptionsOrGroups<TOption, TGroup>
    hasMore?: boolean
    additional?: TAdditional
  }>
}

// ===== AUTO COMPLETE ASYNC SELECT (DEFAULT) =====
export function AutoCompleteAsyncSelect<
  TOption = OptionType,
  TGroup extends GroupBase<TOption> = GroupBase<TOption>,
  TAdditional = PaginationAdditional,
  TIsMulti extends boolean = false,
>({
  fetchOptions,
  loadOptions,
  additional,
  className,
  styles,
  classNames,
  theme,
  components,
  debounceTimeout = 400,
  isClearable = true,
  isSearchable = true,
  getOptionLabel,
  getOptionValue,
  ...props
}: AutoCompleteAsyncSelectProps<TOption, TGroup, TAdditional, TIsMulti>) {
  const internalLoadOptions = useCallback(
    async (
      search: string,
      loadedOptions: OptionsOrGroups<TOption, TGroup>,
      currentAdditional?: TAdditional
    ) => {
      const page = (currentAdditional as any)?.page ?? 1

      if (fetchOptions) {
        const res = await fetchOptions(search, page)
        const data = ('data' in res ? res.data : (res as any).options) ?? []

        let hasMore = false
        if (typeof res.hasMore === 'boolean') {
          hasMore = res.hasMore
        } else if (typeof res.totalPages === 'number') {
          hasMore = page < res.totalPages
        } else {
          hasMore = data.length > 0
        }

        return {
          options: data,
          hasMore,
          additional: { page: page + 1 } as unknown as TAdditional,
        }
      }

      if (loadOptions) {
        return loadOptions(search, loadedOptions, currentAdditional)
      }

      return {
        options: [],
        hasMore: false,
        additional: currentAdditional,
      }
    },
    [fetchOptions, loadOptions]
  )

  const defaultGetOptionLabel = useCallback((opt: any) => {
    return opt?.label ?? opt?.name ?? String(opt?.value ?? opt?.id ?? '')
  }, [])

  const defaultGetOptionValue = useCallback((opt: any) => {
    return String(opt?.value ?? opt?.id ?? opt?.label ?? '')
  }, [])

  return (
    <AsyncPaginate<TOption, TGroup, TAdditional, TIsMulti>
      className={cn('w-full', className)}
      styles={(styles ?? (stylesSelect as any)) as any}
      classNames={{ ...classNamesSelect, ...classNames }}
      theme={theme ?? themeSelect}
      components={{ ...componentsSelect, ...components } as any}
      debounceTimeout={debounceTimeout}
      isClearable={isClearable}
      isSearchable={isSearchable}
      additional={additional ?? ({ page: 1 } as unknown as TAdditional)}
      loadOptions={internalLoadOptions as any}
      getOptionLabel={getOptionLabel ?? defaultGetOptionLabel}
      getOptionValue={getOptionValue ?? defaultGetOptionValue}
      {...props}
    />
  )
}

// ===== AUTO COMPLETE ASYNC CREATABLE SELECT =====
export function AutoCompleteAsyncCreatableSelect<
  TOption = OptionType,
  TGroup extends GroupBase<TOption> = GroupBase<TOption>,
  TAdditional = PaginationAdditional,
  TIsMulti extends boolean = false,
>({
  fetchOptions,
  loadOptions,
  additional,
  className,
  styles,
  classNames,
  theme,
  components,
  debounceTimeout = 400,
  isClearable = true,
  isSearchable = true,
  getOptionLabel,
  getOptionValue,
  ...props
}: AutoCompleteAsyncSelectProps<TOption, TGroup, TAdditional, TIsMulti>) {
  const internalLoadOptions = useCallback(
    async (
      search: string,
      loadedOptions: OptionsOrGroups<TOption, TGroup>,
      currentAdditional?: TAdditional
    ) => {
      const page = (currentAdditional as any)?.page ?? 1

      if (fetchOptions) {
        const res = await fetchOptions(search, page)
        const data = ('data' in res ? res.data : (res as any).options) ?? []

        let hasMore = false
        if (typeof res.hasMore === 'boolean') {
          hasMore = res.hasMore
        } else if (typeof res.totalPages === 'number') {
          hasMore = page < res.totalPages
        } else {
          hasMore = data.length > 0
        }

        return {
          options: data,
          hasMore,
          additional: { page: page + 1 } as unknown as TAdditional,
        }
      }

      if (loadOptions) {
        return loadOptions(search, loadedOptions, currentAdditional)
      }

      return {
        options: [],
        hasMore: false,
        additional: currentAdditional,
      }
    },
    [fetchOptions, loadOptions]
  )

  const defaultGetOptionLabel = useCallback((opt: any) => {
    return opt?.label ?? opt?.name ?? String(opt?.value ?? opt?.id ?? '')
  }, [])

  const defaultGetOptionValue = useCallback((opt: any) => {
    return String(opt?.value ?? opt?.id ?? opt?.label ?? '')
  }, [])

  return (
    <AsyncPaginateCreatable<TOption, TGroup, TAdditional, TIsMulti>
      className={cn('w-full', className)}
      styles={(styles ?? (stylesSelect as any)) as any}
      classNames={{ ...classNamesSelect, ...classNames }}
      theme={theme ?? themeSelect}
      components={{ ...componentsSelect, ...components } as any}
      debounceTimeout={debounceTimeout}
      isClearable={isClearable}
      isSearchable={isSearchable}
      additional={additional ?? ({ page: 1 } as unknown as TAdditional)}
      loadOptions={internalLoadOptions as any}
      getOptionLabel={getOptionLabel ?? defaultGetOptionLabel}
      getOptionValue={getOptionValue ?? defaultGetOptionValue}
      {...props}
    />
  )
}

AutoCompleteAsyncSelect.Creatable = AutoCompleteAsyncCreatableSelect

export default AutoCompleteAsyncSelect
