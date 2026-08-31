'use client'

import * as React from 'react'
import type { ColumnSort, SortDirection, Table } from '@tanstack/react-table'
import { dataTableConfig } from '@/config/data-table'
import { ArrowDownUp, ChevronsUpDown, GripVertical, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from '@/components/ui/sortable'

interface DataTableSortListProps<TData> extends React.ComponentProps<
  typeof PopoverContent
> {
  table: Table<TData>
  disabled?: boolean
}

export function DataTableSortList<TData>({
  table,
  disabled,
  ...props
}: DataTableSortListProps<TData>) {
  const { t } = useTranslation()
  const id = React.useId()
  const labelId = React.useId()
  const descriptionId = React.useId()

  const [open, setOpen] = React.useState(false)
  const addButtonRef = React.useRef<HTMLButtonElement>(null)

  const sorting = table.getState().sorting
  const onSortingChange = table.setSorting

  const { columns, columnLabels } = React.useMemo(() => {
    const sortableColumns = table
      .getAllColumns()
      .filter((column) => column.getCanSort())

    const labels = new Map<string, string>()
    for (const column of sortableColumns) {
      labels.set(column.id, column.columnDef.meta?.label ?? column.id)
    }

    return {
      columns: sortableColumns.map((column) => ({
        id: column.id,
        label: column.columnDef.meta?.label ?? column.id,
      })),
      columnLabels: labels,
    }
  }, [table])

  const onSortAdd = React.useCallback(() => {
    const firstAvailableColumn = columns.find(
      (column) => !sorting.some((sort) => sort.id === column.id)
    )
    if (!firstAvailableColumn) return

    onSortingChange((prev) => [
      ...prev,
      { id: firstAvailableColumn.id, desc: false },
    ])
  }, [columns, sorting, onSortingChange])

  const onSortUpdate = React.useCallback(
    (sortId: string, updates: Partial<ColumnSort>) => {
      onSortingChange((prev) =>
        prev.map((sort) => {
          if (sort.id === sortId) {
            return { ...sort, ...updates }
          }
          return sort
        })
      )
    },
    [onSortingChange]
  )

  const onSortRemove = React.useCallback(
    (sortId: string) => {
      onSortingChange((prev) => prev.filter((item) => item.id !== sortId))
    },
    [onSortingChange]
  )

  const onSortingReset = React.useCallback(() => {
    onSortingChange([])
  }, [onSortingChange])

  const onTriggerKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === ' ' ||
        event.key === 'Enter'
      ) {
        event.preventDefault()
        setOpen(true)
      }
    },
    []
  )

  return (
    <Sortable
      value={sorting}
      onValueChange={onSortingChange}
      getItemValue={(item) => item.id}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            size='sm'
            className='font-normal'
            onKeyDown={onTriggerKeyDown}
            disabled={disabled}
          >
            <ArrowDownUp className='text-muted-foreground' />
            {t('dataTable.sort.sort')}
            {sorting.length > 0 && (
              <Badge
                variant='secondary'
                className='h-[18.24px] rounded-[3.2px] px-[5.12px] font-mono text-[10.4px] font-normal'
              >
                {sorting.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          className='flex w-full max-w-(--radix-popover-content-available-width) flex-col gap-3.5 p-4 sm:min-w-[380px]'
          {...props}
        >
          <div className='flex flex-col gap-1'>
            <h4 id={labelId} className='leading-none font-medium'>
              {sorting.length > 0
                ? t('dataTable.sort.sort')
                : t('dataTable.sort.resetSorting')}
            </h4>
            <p
              id={descriptionId}
              className={cn(
                'text-muted-foreground text-sm',
                sorting.length > 0 && 'sr-only'
              )}
            >
              {sorting.length > 0
                ? t('dataTable.sort.sort')
                : t('dataTable.sort.addSort')}
            </p>
          </div>
          {sorting.length > 0 && (
            <SortableContent asChild>
              <div
                role='list'
                className='flex max-h-[300px] flex-col gap-2 overflow-y-auto p-1'
              >
                {sorting.map((sort) => (
                  <DataTableSortItem
                    key={sort.id}
                    sort={sort}
                    sortItemId={`${id}-sort-${sort.id}`}
                    columns={columns}
                    columnLabels={columnLabels}
                    onSortUpdate={onSortUpdate}
                    onSortRemove={onSortRemove}
                  />
                ))}
              </div>
            </SortableContent>
          )}
          <div className='flex w-full items-center gap-2'>
            <Button
              size='sm'
              className='rounded'
              ref={addButtonRef}
              onClick={onSortAdd}
              disabled={columns.length === 0}
            >
              {t('dataTable.sort.addSort')}
            </Button>
            {sorting.length > 0 && (
              <Button
                variant='outline'
                size='sm'
                className='rounded'
                onClick={onSortingReset}
              >
                {t('dataTable.sort.resetSorting')}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <SortableOverlay>
        <div className='flex items-center gap-2'>
          <div className='bg-primary/10 h-8 w-[180px] rounded-sm' />
          <div className='bg-primary/10 h-8 w-24 rounded-sm' />
          <div className='bg-primary/10 size-8 shrink-0 rounded-sm' />
          <div className='bg-primary/10 size-8 shrink-0 rounded-sm' />
        </div>
      </SortableOverlay>
    </Sortable>
  )
}

interface DataTableSortItemProps {
  sort: ColumnSort
  sortItemId: string
  columns: { id: string; label: string }[]
  columnLabels: Map<string, string>
  onSortUpdate: (sortId: string, updates: Partial<ColumnSort>) => void
  onSortRemove: (sortId: string) => void
}

function DataTableSortItem({
  sort,
  sortItemId,
  columns,
  columnLabels,
  onSortUpdate,
  onSortRemove,
}: DataTableSortItemProps) {
  const { t } = useTranslation()
  const fieldTriggerId = React.useId()
  const fieldListboxId = React.useId()
  const directionListboxId = React.useId()
  const [showFieldSelector, setShowFieldSelector] = React.useState(false)
  const [showDirectionSelector, setShowDirectionSelector] =
    React.useState(false)

  return (
    <SortableItem value={sort.id} asChild>
      <div className='flex items-center gap-2'>
        <Popover open={showFieldSelector} onOpenChange={setShowFieldSelector}>
          <PopoverTrigger asChild>
            <Button
              id={fieldTriggerId}
              aria-controls={fieldListboxId}
              variant='outline'
              size='sm'
              className='w-44 justify-between rounded font-normal'
            >
              <span className='truncate'>{columnLabels.get(sort.id)}</span>
              <ChevronsUpDown className='opacity-50' />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            id={fieldListboxId}
            className='w-(--radix-popover-trigger-width) p-0'
          >
            <Command>
              <CommandInput placeholder={t('dataTable.filter.searchFields')} />
              <CommandList>
                <CommandEmpty>
                  {t('dataTable.filter.noFieldsFound')}
                </CommandEmpty>
                <CommandGroup>
                  {columns.map((column) => (
                    <CommandItem
                      key={column.id}
                      value={column.id}
                      onSelect={(value) => onSortUpdate(sort.id, { id: value })}
                    >
                      <span className='truncate'>{column.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Select
          open={showDirectionSelector}
          onOpenChange={setShowDirectionSelector}
          value={sort.desc ? 'desc' : 'asc'}
          onValueChange={(value: SortDirection) =>
            onSortUpdate(sort.id, { desc: value === 'desc' })
          }
        >
          <SelectTrigger
            aria-controls={directionListboxId}
            size='sm'
            className='w-24 rounded'
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            id={directionListboxId}
            className='min-w-(--radix-select-trigger-width)'
          >
            {dataTableConfig.sortOrders.map((order) => (
              <SelectItem key={order.value} value={order.value}>
                {order.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          aria-controls={sortItemId}
          variant='outline'
          size='icon'
          className='size-8 shrink-0 rounded'
          onClick={() => onSortRemove(sort.id)}
        >
          <Trash2 />
        </Button>
        <SortableItemHandle asChild>
          <Button
            variant='outline'
            size='icon'
            className='size-8 shrink-0 rounded'
          >
            <GripVertical />
          </Button>
        </SortableItemHandle>
      </div>
    </SortableItem>
  )
}
