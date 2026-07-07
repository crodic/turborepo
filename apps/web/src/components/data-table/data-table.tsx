import * as React from 'react'
import {
  type Cell,
  flexRender,
  type Header,
  type Row,
  type Table as TanstackTable,
} from '@tanstack/react-table'
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual'
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
  enableVirtualRows?: boolean
  enableVirtualColumns?: boolean
  virtualHeight?: number | string
  virtualRowEstimateSize?: number
  virtualColumnEstimateSize?: number
  virtualOverscan?: number
  onVirtualEndReached?: () => void
  virtualEndReachedThreshold?: number
  hidePagination?: boolean
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
  enableVirtualRows,
  enableVirtualColumns,
  virtualHeight = 520,
  virtualRowEstimateSize = 48,
  virtualColumnEstimateSize,
  virtualOverscan = 8,
  onVirtualEndReached,
  virtualEndReachedThreshold = 10,
  hidePagination,
  ...props
}: DataTableProps<TData>) {
  const colSpan = table.getVisibleLeafColumns().length

  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col gap-2.5 overflow-hidden contain-[inline-size]',
        className
      )}
      {...props}
    >
      {children}
      <div className='min-w-0 overflow-hidden rounded-md border'>
        {enableVirtualRows || enableVirtualColumns ? (
          <DataTableVirtualized
            table={table}
            isFetching={isFetching}
            onClickRowAction={onClickRowAction}
            renderSubRow={renderSubRow}
            subRowClassName={subRowClassName}
            enableVirtualRows={enableVirtualRows}
            enableVirtualColumns={enableVirtualColumns}
            virtualHeight={virtualHeight}
            virtualRowEstimateSize={virtualRowEstimateSize}
            virtualColumnEstimateSize={virtualColumnEstimateSize}
            virtualOverscan={virtualOverscan}
            onVirtualEndReached={onVirtualEndReached}
            virtualEndReachedThreshold={virtualEndReachedThreshold}
          />
        ) : (
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
        )}
      </div>
      <div className='flex flex-col gap-2.5'>
        {!hidePagination && <DataTablePagination table={table} />}
        {actionBar &&
          table.getFilteredSelectedRowModel().rows.length > 0 &&
          actionBar}
      </div>
    </div>
  )
}

function DataTableVirtualized<TData>({
  table,
  isFetching,
  onClickRowAction,
  renderSubRow,
  subRowClassName,
  enableVirtualRows,
  enableVirtualColumns,
  virtualHeight,
  virtualRowEstimateSize,
  virtualColumnEstimateSize,
  virtualOverscan,
  onVirtualEndReached,
  virtualEndReachedThreshold,
}: {
  table: TanstackTable<TData>
  isFetching?: boolean
  onClickRowAction?: (row: TData) => void
  renderSubRow?: (row: Row<TData>) => React.ReactNode
  subRowClassName?: string
  enableVirtualRows?: boolean
  enableVirtualColumns?: boolean
  virtualHeight: number | string
  virtualRowEstimateSize: number
  virtualColumnEstimateSize?: number
  virtualOverscan: number
  onVirtualEndReached?: () => void
  virtualEndReachedThreshold: number
}) {
  const tableContainerRef = React.useRef<HTMLDivElement>(null)
  const rows = table.getRowModel().rows
  const visibleColumns = table.getVisibleLeafColumns()

  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    estimateSize: () => virtualRowEstimateSize,
    getScrollElement: () => tableContainerRef.current,
    measureElement:
      enableVirtualRows &&
      typeof window !== 'undefined' &&
      navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: virtualOverscan,
    enabled: Boolean(enableVirtualRows),
  })

  const columnVirtualizer = useVirtualizer<
    HTMLDivElement,
    HTMLTableCellElement
  >({
    count: visibleColumns.length,
    estimateSize: (index) =>
      virtualColumnEstimateSize ?? visibleColumns[index]?.getSize() ?? 160,
    getScrollElement: () => tableContainerRef.current,
    horizontal: true,
    overscan: virtualOverscan,
    enabled: Boolean(enableVirtualColumns),
  })

  const virtualRows = enableVirtualRows
    ? rowVirtualizer.getVirtualItems()
    : rows.map((_, index) => ({
        index,
        key: rows[index]?.id ?? index,
        start: index * virtualRowEstimateSize,
        size: virtualRowEstimateSize,
      }))
  const virtualColumns = enableVirtualColumns
    ? columnVirtualizer.getVirtualItems()
    : visibleColumns.map((column, index) => ({
        index,
        key: column.id,
        start: column.getStart(),
        size: column.getSize(),
      }))

  React.useEffect(() => {
    if (!onVirtualEndReached || virtualRows.length === 0) return

    const lastItem = virtualRows[virtualRows.length - 1]
    if (
      lastItem &&
      lastItem.index >= rows.length - virtualEndReachedThreshold
    ) {
      onVirtualEndReached()
    }
  }, [
    onVirtualEndReached,
    rows.length,
    virtualEndReachedThreshold,
    virtualRows,
  ])
  const beforeVirtualColumns =
    enableVirtualColumns && virtualColumns.length > 0
      ? (virtualColumns[0]?.start ?? 0)
      : 0
  const afterVirtualColumns =
    enableVirtualColumns && virtualColumns.length > 0
      ? columnVirtualizer.getTotalSize() -
        ((virtualColumns[virtualColumns.length - 1]?.start ?? 0) +
          (virtualColumns[virtualColumns.length - 1]?.size ?? 0))
      : 0
  const tableWidth = enableVirtualColumns
    ? columnVirtualizer.getTotalSize()
    : table.getTotalSize()

  return (
    <div
      ref={tableContainerRef}
      className='relative w-full max-w-full overflow-auto'
      style={{ height: virtualHeight }}
    >
      <table
        className='grid w-full caption-bottom text-sm'
        style={{ minWidth: tableWidth }}
      >
        <thead className='bg-background sticky top-0 z-10 grid'>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className='flex w-full'>
              {beforeVirtualColumns > 0 && (
                <th style={{ display: 'flex', width: beforeVirtualColumns }} />
              )}
              {getVirtualHeaders(headerGroup.headers, virtualColumns).map(
                (header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className='text-foreground flex h-10 items-center px-2 text-left font-medium whitespace-nowrap'
                    style={{
                      ...getCommonPinningStyles({ column: header.column }),
                      width: header.getSize(),
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                )
              )}
              {afterVirtualColumns > 0 && (
                <th style={{ display: 'flex', width: afterVirtualColumns }} />
              )}
            </tr>
          ))}
        </thead>
        <tbody
          className='grid'
          style={{
            height: enableVirtualRows
              ? `${rowVirtualizer.getTotalSize()}px`
              : undefined,
            position: 'relative',
          }}
        >
          {isFetching ? (
            <tr className='flex h-48 items-center justify-center'>
              <td>
                <Loader2 className='animate-spin' size={32} />
              </td>
            </tr>
          ) : rows.length ? (
            virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index]
              if (!row) return null

              return (
                <DataTableVirtualizedRow
                  key={row.id}
                  row={row}
                  virtualRow={virtualRow}
                  rowVirtualizer={rowVirtualizer}
                  onClickRowAction={onClickRowAction}
                  renderSubRow={renderSubRow}
                  subRowClassName={subRowClassName}
                  beforeVirtualColumns={beforeVirtualColumns}
                  afterVirtualColumns={afterVirtualColumns}
                  virtualColumns={virtualColumns}
                  enableVirtualRows={enableVirtualRows}
                />
              )
            })
          ) : (
            <tr className='flex h-24 items-center justify-center'>
              <td className='text-center'>No results.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function DataTableVirtualizedRow<TData>({
  row,
  virtualRow,
  rowVirtualizer,
  onClickRowAction,
  renderSubRow,
  subRowClassName,
  beforeVirtualColumns,
  afterVirtualColumns,
  virtualColumns,
  enableVirtualRows,
}: {
  row: Row<TData>
  virtualRow: Pick<VirtualItem, 'index' | 'key' | 'start' | 'size'>
  rowVirtualizer: ReturnType<
    typeof useVirtualizer<HTMLDivElement, HTMLTableRowElement>
  >
  onClickRowAction?: (row: TData) => void
  renderSubRow?: (row: Row<TData>) => React.ReactNode
  subRowClassName?: string
  beforeVirtualColumns: number
  afterVirtualColumns: number
  virtualColumns: Array<Pick<VirtualItem, 'index' | 'key' | 'start' | 'size'>>
  enableVirtualRows?: boolean
}) {
  const cells = row.getVisibleCells()

  return (
    <tr
      ref={(node) => {
        if (enableVirtualRows) rowVirtualizer.measureElement(node)
      }}
      data-index={virtualRow.index}
      data-state={row.getIsSelected() && 'selected'}
      className={cn(
        'hover:bg-muted/50 flex w-full flex-wrap border-b transition-colors',
        enableVirtualRows && 'absolute'
      )}
      style={{
        transform: enableVirtualRows
          ? `translateY(${virtualRow.start}px)`
          : undefined,
      }}
    >
      {beforeVirtualColumns > 0 && (
        <td style={{ display: 'flex', width: beforeVirtualColumns }} />
      )}
      {getVirtualCells(cells, virtualColumns).map((cell) => (
        <td
          key={cell.id}
          className={cn(
            'flex items-center p-2 align-middle whitespace-nowrap',
            onClickRowAction && 'cursor-pointer'
          )}
          style={{
            ...getCommonPinningStyles({ column: cell.column }),
            minWidth: `${cell.column.columnDef.minSize}px`,
            width: cell.column.getSize(),
          }}
          onClick={() =>
            cell.id.includes('actions') ||
            cell.id.includes('select') ||
            cell.id.includes('expand')
              ? undefined
              : onClickRowAction?.(row.original)
          }
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
      {afterVirtualColumns > 0 && (
        <td style={{ display: 'flex', width: afterVirtualColumns }} />
      )}
      {renderSubRow && row.getIsExpanded() && (
        <td
          className={cn(
            'bg-muted/30 w-full p-2 whitespace-normal',
            subRowClassName
          )}
          style={{ flexBasis: '100%' }}
        >
          {renderSubRow(row)}
        </td>
      )}
    </tr>
  )
}

function getVirtualHeaders<TData>(
  headers: Header<TData, unknown>[],
  virtualColumns: Array<Pick<VirtualItem, 'index'>>
) {
  return virtualColumns
    .map((virtualColumn) => headers[virtualColumn.index])
    .filter((header): header is Header<TData, unknown> => Boolean(header))
}

function getVirtualCells<TData>(
  cells: Cell<TData, unknown>[],
  virtualColumns: Array<Pick<VirtualItem, 'index'>>
) {
  return virtualColumns
    .map((virtualColumn) => cells[virtualColumn.index])
    .filter((cell): cell is Cell<TData, unknown> => Boolean(cell))
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
