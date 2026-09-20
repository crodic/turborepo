import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import i18n from '@/i18n'
import {
  Calendar,
  Copy,
  Eye,
  FileIcon,
  FileImage,
  Folder,
  Globe,
  Lock,
  MoreHorizontal,
  MoveRight,
  Tag,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { FilePreviewThumbnail } from './file-preview'
import { ColumnKey, type FileSchema } from './schema'

type FileTableColumnOptions = {
  onPreview: (file: FileSchema) => void
  onCopyUrl: (file: FileSchema) => void
  onMove: (file: FileSchema) => void
  onDelete: (file: FileSchema) => void
  canUpdate: boolean
  canDelete: boolean
}

export function getFilesTableColumns({
  onPreview,
  onCopyUrl,
  onMove,
  onDelete,
  canUpdate,
  canDelete,
}: FileTableColumnOptions): ColumnDef<FileSchema>[] {
  const selectionColumn: ColumnDef<FileSchema> = {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label={i18n.t('files.table.selectAll')}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={i18n.t('files.table.selectRow')}
      />
    ),
    size: 36,
    enableColumnFilter: false,
    enableHiding: false,
    enableSorting: false,
  }

  const columns: ColumnDef<FileSchema>[] = [
    {
      id: ColumnKey.originalName,
      accessorFn: (row) => row.original_name,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('files.table.name')}
        />
      ),
      cell: ({ row }) => {
        const file = row.original
        const isLocalDisk = file.disk === 'local'

        return (
          <div className='flex min-w-0 items-center gap-3'>
            <div className='bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border'>
              <FilePreviewThumbnail
                file={file}
                transformations='w_80,h_80,c_fill,q_75'
                hoverToPlay={false}
              />
            </div>
            <div className='min-w-0'>
              <div className='flex items-center gap-1.5'>
                <p className='truncate font-medium'>{file.original_name}</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1 rounded-sm px-1 py-0.5 text-[10px] font-medium',
                        isLocalDisk
                          ? 'border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-muted text-muted-foreground border-border/60 border'
                      )}
                    >
                      {isLocalDisk ? (
                        <Lock className='size-2.5' />
                      ) : (
                        <Globe className='size-2.5' />
                      )}
                      <span>
                        {isLocalDisk
                          ? i18n.t('files.disk.local')
                          : i18n.t('files.disk.public')}
                      </span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side='top' className='max-w-xs text-xs'>
                    {isLocalDisk
                      ? i18n.t('files.disk.localTooltip')
                      : i18n.t('files.disk.publicTooltip')}
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className='text-muted-foreground truncate text-xs'>
                {file.public_id}
              </p>
            </div>
          </div>
        )
      },
      meta: {
        label: i18n.t('files.table.name'),
        placeholder: i18n.t('files.filters.name'),
        variant: 'text',
        icon: FileIcon,
      },
      enableColumnFilter: true,
      enableSorting: true,
      minSize: 260,
    },
    {
      id: ColumnKey.folder,
      accessorFn: (row) => row.folder,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('files.table.folder')}
        />
      ),
      cell: ({ row }) => (
        <Badge variant='outline'>
          <Folder className='size-3' />
          {row.original.folder ?? i18n.t('files.folders.root')}
        </Badge>
      ),
      meta: {
        label: i18n.t('files.table.folder'),
        placeholder: i18n.t('files.filters.folder'),
        variant: 'text',
        icon: Folder,
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: ColumnKey.resourceType,
      accessorFn: (row) => row.resource_type,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('files.table.type')}
        />
      ),
      cell: ({ row }) => (
        <Badge variant='secondary'>{row.original.resource_type}</Badge>
      ),
      meta: {
        label: i18n.t('files.table.type'),
        variant: 'select',
        icon: FileImage,
        options: [
          { label: 'Image', value: 'image' },
          { label: 'Video', value: 'video' },
          { label: 'Raw', value: 'raw' },
          { label: 'File', value: 'file' },
        ],
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: ColumnKey.mime,
      accessorFn: (row) => row.mime,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('files.table.mime')}
        />
      ),
      cell: ({ row }) => (
        <span className='text-muted-foreground text-sm'>
          {row.original.mime}
        </span>
      ),
      meta: {
        label: i18n.t('files.table.mime'),
        placeholder: i18n.t('files.filters.mime'),
        variant: 'text',
        icon: Tag,
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: ColumnKey.size,
      accessorFn: (row) => row.size,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('files.table.size')}
        />
      ),
      cell: ({ row }) => formatBytes(row.original.size),
      enableSorting: true,
    },
    {
      id: ColumnKey.dimensions,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('files.table.dimensions')}
        />
      ),
      cell: ({ row }) => {
        const { width, height } = row.original
        return width && height ? `${width} x ${height}` : '-'
      },
      enableSorting: false,
    },
    {
      id: ColumnKey.status,
      accessorFn: (row) => row.status,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('files.table.status')}
        />
      ),
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'active' ? 'default' : 'secondary'}
        >
          {row.original.status}
        </Badge>
      ),
      meta: {
        label: i18n.t('files.table.status'),
        variant: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Archived', value: 'archived' },
        ],
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: ColumnKey.createdAt,
      accessorFn: (row) => row.createdAt,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('files.table.createdAt')}
        />
      ),
      cell: ({ row }) => format(row.original.createdAt, 'dd/MM/yyyy HH:mm'),
      meta: {
        label: i18n.t('files.table.createdAt'),
        variant: 'dateRange',
        icon: Calendar,
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: ColumnKey.actions,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={i18n.t('files.table.actions')}
        />
      ),
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='icon'>
              <MoreHorizontal className='size-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => onPreview(row.original)}>
              <Eye className='size-4' />
              {i18n.t('files.actions.preview')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopyUrl(row.original)}>
              <Copy className='size-4' />
              {i18n.t('files.actions.copyUrl')}
            </DropdownMenuItem>
            {canUpdate && (
              <DropdownMenuItem onClick={() => onMove(row.original)}>
                <MoveRight className='size-4' />
                {i18n.t('files.actions.move')}
              </DropdownMenuItem>
            )}
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant='destructive'
                  onClick={() => onDelete(row.original)}
                >
                  <Trash2 className='size-4' />
                  {i18n.t('files.actions.delete')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 64,
      enableColumnFilter: false,
      enableHiding: false,
      enableSorting: false,
    },
  ]

  return canDelete ? [selectionColumn, ...columns] : columns
}

export function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, index)

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}
