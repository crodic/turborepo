import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { useMutationDeleteCustomField } from '../queries'
import type { PolarCustomFieldSchema } from '../schema'

function CustomFieldRowActions({
  customField,
}: {
  customField: PolarCustomFieldSchema
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const deleteMutation = useMutationDeleteCustomField()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon' className='size-8 p-0'>
            <MoreHorizontal className='size-4' />
            <span className='sr-only'>Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className='text-destructive focus:text-destructive'
          >
            <Trash2 className='mr-2 size-4' />
            Delete Field
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{customField.name}&quot; (
              {customField.slug})? This field will no longer be collected during
              Polar checkouts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(customField.id)}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function getCustomFieldsTableColumns(): ColumnDef<PolarCustomFieldSchema>[] {
  return [
    {
      id: 'slug',
      accessorFn: (row) => row.slug,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Field Slug' />
      ),
      cell: ({ row }) => (
        <Badge variant='outline' className='font-mono text-xs'>
          {row.original.slug}
        </Badge>
      ),
    },
    {
      id: 'name',
      accessorFn: (row) => row.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Name' />
      ),
      cell: ({ row }) => (
        <span className='text-sm font-medium'>{row.original.name}</span>
      ),
    },
    {
      id: 'type',
      accessorFn: (row) => row.type,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Type' />
      ),
      cell: ({ row }) => {
        const type = row.original.type
        return (
          <Badge variant='secondary' className='font-mono text-xs capitalize'>
            {type}
          </Badge>
        )
      },
    },
    {
      id: 'required',
      accessorFn: (row) => row.required,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Required' />
      ),
      cell: ({ row }) => (
        <Badge
          variant={row.original.required ? 'default' : 'outline'}
          className='text-xs'
        >
          {row.original.required ? 'Required' : 'Optional'}
        </Badge>
      ),
    },
    {
      id: 'status',
      accessorFn: (row) => row.isActive,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Status' />
      ),
      cell: ({ row }) => (
        <Badge
          variant={row.original.isActive ? 'default' : 'secondary'}
          className='text-xs'
        >
          {row.original.isActive ? 'Active' : 'Disabled'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: () => <span className='text-xs'>Actions</span>,
      cell: ({ row }) => <CustomFieldRowActions customField={row.original} />,
    },
  ]
}
