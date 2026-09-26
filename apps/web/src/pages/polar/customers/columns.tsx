import { useState } from 'react'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye, MoreHorizontal, Trash2, UserCheck } from 'lucide-react'
import { Link } from 'react-router'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { useMutationDeleteCustomer } from '../queries'
import type { PolarCustomerSchema } from '../schema'

interface CustomerRowActionsProps {
  customer: PolarCustomerSchema
  onViewDetails: (customer: PolarCustomerSchema) => void
}

function CustomerRowActions({
  customer,
  onViewDetails,
}: CustomerRowActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const deleteMutation = useMutationDeleteCustomer()

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
          <DropdownMenuItem onClick={() => onViewDetails(customer)}>
            <Eye className='text-muted-foreground mr-2 size-4' />
            View Live State & Cards
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className='text-destructive focus:text-destructive'
          >
            <Trash2 className='mr-2 size-4' />
            Remove Customer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Polar Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove customer &quot;{customer.email}
              &quot;? This will unlink and remove their customer record on
              Polar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate({ id: customer.id })}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function getCustomersTableColumns({
  onViewDetails,
}: {
  onViewDetails: (customer: PolarCustomerSchema) => void
}): ColumnDef<PolarCustomerSchema>[] {
  return [
    {
      id: 'customer',
      accessorFn: (row) => row.email,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Customer' />
      ),
      cell: ({ row }) => {
        const { name, email, avatarUrl } = row.original
        return (
          <div className='flex items-center gap-3'>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name || email}
                className='size-8 rounded-full border object-cover'
              />
            ) : (
              <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full text-xs font-bold'>
                {(name || email).charAt(0).toUpperCase()}
              </div>
            )}
            <div className='flex min-w-0 flex-col'>
              <span className='truncate text-sm font-medium'>
                {name || 'Unnamed'}
              </span>
              <span className='text-muted-foreground truncate text-xs'>
                {email}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      id: 'polarCustomerId',
      accessorFn: (row) => row.polarCustomerId,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Polar Customer ID' />
      ),
      cell: ({ row }) => (
        <Badge variant='outline' className='font-mono text-xs font-normal'>
          {row.original.polarCustomerId}
        </Badge>
      ),
    },
    {
      id: 'linkedUser',
      accessorFn: (row) => row.userId,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Linked User' />
      ),
      cell: ({ row }) => {
        const userId = row.original.userId
        return userId ? (
          <Link
            to={`/users/${userId}/show`}
            className='text-primary inline-flex items-center gap-1 font-mono text-xs hover:underline'
          >
            <UserCheck className='size-3.5' />
            User #{userId}
          </Link>
        ) : (
          <span className='text-muted-foreground text-xs italic'>
            Guest / Unlinked
          </span>
        )
      },
    },
    {
      id: 'taxId',
      accessorFn: (row) => row.taxId,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Tax ID' />
      ),
      cell: ({ row }) => (
        <span className='text-muted-foreground font-mono text-xs'>
          {row.original.taxId || '-'}
        </span>
      ),
    },
    {
      id: 'createdAt',
      accessorFn: (row) => row.createdAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Joined' />
      ),
      cell: ({ row }) => (
        <span className='text-muted-foreground text-xs'>
          {format(new Date(row.original.createdAt), 'dd/MM/yyyy HH:mm')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className='text-xs'>Actions</span>,
      cell: ({ row }) => (
        <CustomerRowActions
          customer={row.original}
          onViewDetails={onViewDetails}
        />
      ),
    },
  ]
}
