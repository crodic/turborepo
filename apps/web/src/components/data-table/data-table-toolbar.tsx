'use client'

import * as React from 'react'
import type { Column, Table } from '@tanstack/react-table'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableDateFilter } from '@/components/data-table/data-table-date-filter'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import { DataTableSliderFilter } from '@/components/data-table/data-table-slider-filter'
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options'
import { DataTableAsyncSelectFilter } from './data-table-async-select-filter'

interface DataTableToolbarProps<TData> extends React.ComponentProps<'div'> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
  children,
  className,
  ...props
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  const columns = React.useMemo(
    () => table.getAllColumns().filter((column) => column.getCanFilter()),
    [table]
  )

  const onReset = React.useCallback(() => {
    table.resetColumnFilters()
  }, [table])

  return (
    <div
      role='toolbar'
      aria-orientation='horizontal'
      className={cn(
        'flex w-full items-start justify-between gap-2 p-1',
        className
      )}
      {...props}
    >
      <div className='flex flex-1 flex-wrap items-center gap-2'>
        {columns.map((column) => (
          <DataTableToolbarFilter
            key={column.id}
            column={column}
            table={table}
          />
        ))}
        {isFiltered && (
          <Button
            aria-label='Reset filters'
            variant='outline'
            size='sm'
            className='border-dashed'
            onClick={onReset}
          >
            <X />
            Reset
          </Button>
        )}
      </div>
      <div className='flex items-center gap-2'>
        {children}
        <DataTableViewOptions table={table} align='end' />
      </div>
    </div>
  )
}
interface DataTableToolbarFilterProps<TData> {
  column: Column<TData>
  table: Table<TData>
}

function DataTableToolbarFilter<TData>({
  column,
  table,
}: DataTableToolbarFilterProps<TData>) {
  {
    const columnMeta = table.getColumn(column.id)?.columnDef.meta

    const onFilterRender = React.useCallback(() => {
      if (!columnMeta?.variant) return null

      const SearchIcon = columnMeta.icon ?? Search

      switch (columnMeta.variant) {
        case 'text':
          return (
            <div className='relative'>
              <SearchIcon className='text-muted-foreground absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2' />
              <Input
                placeholder={columnMeta.placeholder ?? columnMeta.label}
                value={(column.getFilterValue() as string) ?? ''}
                onChange={(event) => column.setFilterValue(event.target.value)}
                className='h-8 w-56 pr-8 pl-8'
              />
              {(column?.getFilterValue() as string) && (
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => column.setFilterValue('')}
                  className='absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2'
                >
                  <X className='h-4 w-4' />
                </Button>
              )}
            </div>
          )

        case 'number':
          return (
            <div className='relative'>
              <SearchIcon className='text-muted-foreground absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2' />
              <Input
                type='number'
                inputMode='numeric'
                placeholder={columnMeta.placeholder ?? columnMeta.label}
                value={(column.getFilterValue() as string) ?? ''}
                onChange={(event) => column.setFilterValue(event.target.value)}
                className={cn('h-8 w-56 pl-8', columnMeta.unit && 'pr-8')}
              />
              {columnMeta.unit && (
                <span className='bg-accent text-muted-foreground absolute top-0 right-0 bottom-0 flex items-center rounded-r-md px-2 text-sm'>
                  {columnMeta.unit}
                </span>
              )}
            </div>
          )

        case 'range':
          return (
            <DataTableSliderFilter
              column={column}
              title={columnMeta.label ?? column.id}
            />
          )

        case 'date':
        case 'dateRange':
          return (
            <DataTableDateFilter
              column={column}
              title={columnMeta.label ?? column.id}
              multiple={columnMeta.variant === 'dateRange'}
            />
          )

        case 'select':
        case 'multiSelect':
          return (
            <DataTableFacetedFilter
              column={column}
              title={columnMeta.label ?? column.id}
              options={columnMeta.options ?? []}
              multiple={columnMeta.variant === 'multiSelect'}
            />
          )

        case 'asyncSelect':
        case 'multiAsyncSelect':
          return (
            <DataTableAsyncSelectFilter
              column={column}
              title={columnMeta.label ?? column.id}
              multiple={columnMeta.variant === 'multiAsyncSelect'}
              fetchOptions={columnMeta.fetchOptions}
            />
          )

        default:
          return null
      }
    }, [column, columnMeta])

    return onFilterRender()
  }
}
