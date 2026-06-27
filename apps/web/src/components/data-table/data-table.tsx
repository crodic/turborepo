import type * as React from 'react'
import {
  flexRender,
  type Row,
  type Table as TanstackTable,
} from '@tanstack/react-table'
import { ChevronRight, Loader2 } from 'lucide-react'
import { getCommonPinningStyles } from '@/lib/data-table'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table/data-table-pagination'

interface DataTableProps<TData> extends React.ComponentProps<'div'> {
  table: TanstackTable<TData>
  actionBar?: React.ReactNode
  onClickRowAction?: (row: TData) => void
  isFetching?: boolean
  renderSubRow?: (row: Row<TData>) => React.ReactNode
  subRowClassName?: string
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  onClickRowAction,
  isFetching,
  renderSubRow,
  subRowClassName,
  ...props
}: DataTableProps<TData>) {
  const colSpan = table.getVisibleLeafColumns().length

  return (
    <div
      className={cn('flex w-full flex-col gap-2.5 overflow-auto', className)}
      {...props}
    >
      {children}
      <div className='overflow-hidden rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{
                      ...getCommonPinningStyles({ column: header.column }),
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isFetching ? (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className='h-48'
                >
                  <div className='flex items-center justify-center'>
                    <Loader2 className='animate-spin' size={32} />
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table
                .getRowModel()
                .rows.map((row) => (
                  <DataTableRow
                    key={row.id}
                    row={row}
                    onClickRowAction={onClickRowAction}
                    renderSubRow={renderSubRow}
                    subRowClassName={subRowClassName}
                    colSpan={colSpan}
                  />
                ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className='h-24 text-center'
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className='flex flex-col gap-2.5'>
        <DataTablePagination table={table} />
        {actionBar &&
          table.getFilteredSelectedRowModel().rows.length > 0 &&
          actionBar}
      </div>
    </div>
  )
}

function DataTableRow<TData>({
  row,
  onClickRowAction,
  renderSubRow,
  subRowClassName,
  colSpan,
}: {
  row: Row<TData>
  onClickRowAction?: (row: TData) => void
  renderSubRow?: (row: Row<TData>) => React.ReactNode
  subRowClassName?: string
  colSpan: number
}) {
  return (
    <>
      <TableRow data-state={row.getIsSelected() && 'selected'}>
        {row.getVisibleCells().map((cell) => (
          <TableCell
            key={cell.id}
            style={{
              ...getCommonPinningStyles({ column: cell.column }),
              minWidth: `${cell.column.columnDef.minSize}px`,
            }}
            onClick={() =>
              cell.id.includes('actions') ||
              cell.id.includes('select') ||
              cell.id.includes('expand')
                ? undefined
                : onClickRowAction?.(row.original)
            }
            className={cn(onClickRowAction && 'cursor-pointer')}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
      {renderSubRow && row.getIsExpanded() && (
        <TableRow className='hover:bg-transparent'>
          <TableCell
            colSpan={colSpan}
            className={cn('bg-muted/30 whitespace-normal', subRowClassName)}
          >
            {renderSubRow(row)}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export function DataTableExpandCell<TData>({ row }: { row: Row<TData> }) {
  const canExpand = row.getCanExpand()

  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      className='size-8'
      disabled={!canExpand}
      aria-label={row.getIsExpanded() ? 'Collapse row' : 'Expand row'}
      onClick={(event) => {
        event.stopPropagation()
        row.toggleExpanded()
      }}
    >
      <ChevronRight
        className={cn(
          'size-4 transition-transform',
          row.getIsExpanded() && 'rotate-90'
        )}
      />
    </Button>
  )
}

export function DataTableExpandingCell<TData>({
  row,
  children,
  className,
}: {
  row: Row<TData>
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('flex min-w-0 items-center gap-2', className)}
      style={{ paddingLeft: `${row.depth * 1.5}rem` }}
    >
      {row.getCanExpand() ? (
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-7 shrink-0'
          aria-label={row.getIsExpanded() ? 'Collapse row' : 'Expand row'}
          onClick={(event) => {
            event.stopPropagation()
            row.toggleExpanded()
          }}
        >
          <ChevronRight
            className={cn(
              'size-4 transition-transform',
              row.getIsExpanded() && 'rotate-90'
            )}
          />
        </Button>
      ) : (
        <span className='size-7 shrink-0' />
      )}
      <div className='min-w-0 flex-1'>{children}</div>
    </div>
  )
}
