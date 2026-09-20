'use client'

import * as React from 'react'
import { LockClosedIcon } from '@radix-ui/react-icons'
import type { Table } from '@tanstack/react-table'
import { Check, RotateCcw, Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
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

interface DataTableViewOptionsProps<TData> extends React.ComponentProps<
  typeof PopoverContent
> {
  table: Table<TData>
  disabled?: boolean
}

export function DataTableViewOptions<TData>({
  table,
  disabled,
  ...props
}: DataTableViewOptionsProps<TData>) {
  const { t } = useTranslation()

  const columns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter(
          (column) =>
            typeof column.accessorFn !== 'undefined' &&
            column.id !== 'actions' &&
            column.id !== 'select'
        ),
    [table]
  )

  if (columns.every((column) => !column.getCanHide())) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={t(
            'data_table.toggle_columns',
            t('dataTable.viewOptions.toggleColumns', 'Toggle columns')
          )}
          role='combobox'
          variant='outline'
          size='sm'
          className='ml-auto hidden h-8 font-normal lg:flex'
          disabled={disabled}
        >
          <Settings2 className='text-muted-foreground mr-1 size-4' />
          {t(
            'data_table.column_settings',
            t('dataTable.viewOptions.view', 'Column settings')
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-60 p-0' align='end' {...props}>
        <Command>
          <CommandInput
            placeholder={t(
              'data_table.search_columns',
              t('dataTable.viewOptions.searchColumns', 'Search columns...')
            )}
          />
          <CommandList>
            <CommandEmpty>
              {t(
                'data_table.no_columns_found',
                t('dataTable.viewOptions.noColumnsFound', 'No columns found.')
              )}
            </CommandEmpty>
            <CommandGroup>
              {columns.map((column) => {
                const canHide = column.getCanHide()
                const isVisible = column.getIsVisible()

                return (
                  <CommandItem
                    key={column.id}
                    disabled={!canHide}
                    onSelect={() => {
                      if (!canHide) return
                      column.toggleVisibility(!isVisible)
                    }}
                  >
                    <span className='truncate'>
                      {column.columnDef.meta?.label ?? column.id}
                    </span>
                    <div className='ml-auto flex items-center gap-2'>
                      {!canHide ? (
                        <LockClosedIcon className='text-muted-foreground size-3.5 shrink-0' />
                      ) : (
                        <Check
                          className={cn(
                            'text-primary size-4 shrink-0',
                            isVisible ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => table.resetColumnVisibility()}
                className='text-muted-foreground cursor-pointer justify-center text-center text-xs'
              >
                <RotateCcw className='mr-1.5 size-3.5' />
                {t('data_table.reset_columns', 'Reset to default')}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
