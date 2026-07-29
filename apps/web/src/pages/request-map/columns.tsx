import { format } from 'date-fns'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { ColumnKey, type RequestLogSchema } from './schema'

export function getRequestLogColumns(): ColumnDef<RequestLogSchema>[] {
  return [
    {
      accessorKey: ColumnKey.method,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Method' />
      ),
      cell: ({ row }) => {
        const method = row.getValue(ColumnKey.method) as string
        const color =
          method === 'GET'
            ? 'bg-blue-500'
            : method === 'POST'
              ? 'bg-green-500'
              : method === 'PUT'
                ? 'bg-yellow-500'
                : method === 'DELETE'
                  ? 'bg-red-500'
                  : 'bg-gray-500'
        return <Badge className={`${color} text-white`}>{method}</Badge>
      },
    },
    {
      accessorKey: ColumnKey.path,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Path' />
      ),
      cell: ({ row }) => {
        return (
          <div
            className='max-w-[200px] truncate font-mono text-sm'
            title={row.getValue(ColumnKey.path)}
          >
            {row.getValue(ColumnKey.path)}
          </div>
        )
      },
    },
    {
      accessorKey: ColumnKey.status,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Status' />
      ),
      cell: ({ row }) => {
        const status = row.getValue(ColumnKey.status) as number
        const variant =
          status < 400 ? 'default' : status < 500 ? 'warning' : 'destructive'
        return <Badge variant={variant as any}>{status}</Badge>
      },
    },
    {
      accessorKey: ColumnKey.duration,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Duration' />
      ),
      cell: ({ row }) => {
        const duration = row.getValue(ColumnKey.duration) as number
        return <div>{duration}ms</div>
      },
    },
    {
      accessorKey: ColumnKey.ip,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='IP Address' />
      ),
      cell: ({ row }) => {
        return <div>{row.getValue(ColumnKey.ip) || '-'}</div>
      },
    },
    {
      accessorKey: ColumnKey.browser,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Browser' />
      ),
      cell: ({ row }) => {
        return <div>{row.getValue(ColumnKey.browser) || '-'}</div>
      },
    },
    {
      accessorKey: ColumnKey.os,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='OS' />
      ),
      cell: ({ row }) => {
        return <div>{row.getValue(ColumnKey.os) || '-'}</div>
      },
    },
    {
      accessorKey: ColumnKey.timestamp,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Time' />
      ),
      cell: ({ row }) => {
        const val = row.getValue(ColumnKey.timestamp)
        return (
          <div>
            {val ? format(new Date(val as string), 'dd/MM/yyyy HH:mm:ss') : '-'}
          </div>
        )
      },
    },
  ]
}
