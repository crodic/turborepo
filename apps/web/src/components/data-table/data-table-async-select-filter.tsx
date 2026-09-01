'use client'

import * as React from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { Column } from '@tanstack/react-table'
import { type PaginateQueryParams } from '@/global'
import { type Option } from '@/types/data-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Check, Loader2, PlusCircle, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import useDebounce from '@/hooks/use-debounce'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

export interface AsyncSelectResponse {
  data: Option[]
  meta?: {
    totalItems?: number
  }
}

interface DataTableAsyncSelectFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  title?: string
  multiple?: boolean
  limit?: number
  fetchOptions?: (params: PaginateQueryParams) => Promise<AsyncSelectResponse>
}

export function DataTableAsyncSelectFilter<TData, TValue>({
  column,
  title,
  multiple,
  fetchOptions,
  limit = 10,
}: DataTableAsyncSelectFilterProps<TData, TValue>) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const parentRef = React.useRef<HTMLDivElement>(null)

  const debouncedSearch = useDebounce(search, 400)

  const columnFilterValue = column?.getFilterValue()

  const selectedValues = React.useMemo(
    () => new Set(Array.isArray(columnFilterValue) ? columnFilterValue : []),
    [columnFilterValue]
  )

  const searchKey =
    column?.columnDef.meta?.searchKey ?? column?.columnDef.id ?? 'search'

  const fetchOptionsRef = React.useRef(fetchOptions)
  fetchOptionsRef.current = fetchOptions

  /*
  =========================
  QUERY
  =========================
  */

  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  const query = useInfiniteQuery({
    queryKey: [
      'datatable-async-filter',
      column?.id,
      debouncedSearch,
      limit,
      searchKey,
    ],

    enabled: open && Boolean(fetchOptions),

    initialPageParam: 1,

    queryFn: async ({ pageParam }) => {
      if (!fetchOptionsRef.current) {
        return { data: [], meta: { totalItems: 0 } }
      }

      const params: PaginateQueryParams = {
        per_page: limit,
        page: pageParam,
        [searchKey]: debouncedSearch,
      }

      return fetchOptionsRef.current(params)
    },

    getNextPageParam: (lastPage, pages) => {
      const total = lastPage.meta?.totalItems ?? 0
      const loaded = pages.length * limit

      if (loaded >= total) return undefined

      return pages.length + 1
    },

    refetchOnWindowFocus: false,
  })

  const {
    data,
    isLoading,
    isFetching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = query

  // Flatten and deduplicate options by value
  const options = React.useMemo(() => {
    const all = data?.pages.flatMap((p) => p.data) ?? []
    const seen = new Set<string>()
    return all.filter((item) => {
      if (!item || seen.has(item.value)) return false
      seen.add(item.value)
      return true
    })
  }, [data])

  /*
  =========================
  VIRTUALIZATION
  =========================
  */

  const rowVirtualizer = useVirtualizer({
    count: options.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 8,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  /*
  =========================
  INFINITE SCROLL
  =========================
  */

  React.useEffect(() => {
    if (!virtualItems.length) return

    const lastItem = virtualItems[virtualItems.length - 1]

    if (
      options.length > 0 &&
      lastItem.index >= options.length - 3 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage()
    }
  }, [
    virtualItems,
    options.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ])

  /*
  =========================
  SELECT & RESET
  =========================
  */

  const onItemSelect = React.useCallback(
    (option: Option, isSelected: boolean) => {
      if (!column) return

      if (multiple) {
        const newValues = new Set(selectedValues)

        if (isSelected) newValues.delete(option.value)
        else newValues.add(option.value)

        const values = Array.from(newValues)

        column.setFilterValue(values.length ? values : undefined)
      } else {
        column.setFilterValue(isSelected ? undefined : [option.value])
        setOpen(false)
      }
    },
    [column, multiple, selectedValues]
  )

  const onReset = React.useCallback(
    (event?: React.MouseEvent) => {
      event?.stopPropagation()
      column?.setFilterValue(undefined)
      setSearch('')
    },
    [column]
  )

  /*
  =========================
  RENDER
  =========================
  */

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='border-dashed'
          aria-label={title}
        >
          {selectedValues.size > 0 ? (
            <XCircle
              className='text-muted-foreground size-4'
              onClick={onReset}
            />
          ) : (
            <PlusCircle className='text-muted-foreground size-4' />
          )}

          {title}

          {selectedValues.size > 0 && (
            <>
              <Separator orientation='vertical' className='mx-1 h-4' />
              <Badge variant='secondary'>{selectedValues.size}</Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className='w-64 p-0' align='start'>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={title}
            value={search}
            onValueChange={setSearch}
          />

          <CommandList ref={parentRef} className='max-h-72 overflow-y-auto'>
            <CommandEmpty>
              {isLoading || isFetching ? (
                <div className='flex flex-col items-center gap-2 p-2 text-sm'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  {t('dataTable.filter.searching')}
                </div>
              ) : (
                t('dataTable.filter.noResultsFound')
              )}
            </CommandEmpty>

            <CommandGroup>
              <div
                style={{
                  height: rowVirtualizer.getTotalSize(),
                  position: 'relative',
                }}
              >
                {virtualItems.map((virtualRow) => {
                  const option = options[virtualRow.index]

                  if (!option) return null

                  const isSelected = selectedValues.has(option.value)

                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        onItemSelect(option, isSelected)
                      }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div
                        className={cn(
                          'border-primary flex size-4 items-center justify-center rounded-sm border',
                          isSelected
                            ? 'bg-primary'
                            : 'opacity-50 [&_svg]:invisible'
                        )}
                      >
                        <Check className='h-3 w-3 text-white' />
                      </div>

                      {option.icon && <option.icon />}

                      <span className='truncate'>{option.label}</span>
                    </CommandItem>
                  )
                })}
              </div>

              {isFetchingNextPage && (
                <div className='flex justify-center p-2'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                </div>
              )}
            </CommandGroup>

            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onReset()}
                    className='justify-center text-center'
                  >
                    {t('dataTable.filter.clearFilters')}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
