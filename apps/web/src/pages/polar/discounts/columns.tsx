import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Edit2, MoreHorizontal, Trash2 } from 'lucide-react'
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
import { useMutationDeleteDiscount } from '../queries'
import type { PolarDiscountSchema } from '../schema'

interface DiscountsTableActionsProps {
  discount: PolarDiscountSchema
  onEdit: (discount: PolarDiscountSchema) => void
}

function DiscountRowActions({ discount, onEdit }: DiscountsTableActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const deleteMutation = useMutationDeleteDiscount()

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
          <DropdownMenuItem onClick={() => onEdit(discount)}>
            <Edit2 className='text-muted-foreground mr-2 size-4' />
            Edit Discount
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className='text-destructive focus:text-destructive'
          >
            <Trash2 className='mr-2 size-4' />
            Delete Discount
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discount</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete discount &quot;{discount.name}
              &quot;? This action cannot be undone on Polar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(discount.id)}
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

export function getDiscountsTableColumns({
  onEdit,
}: {
  onEdit: (discount: PolarDiscountSchema) => void
}): ColumnDef<PolarDiscountSchema>[] {
  return [
    {
      id: 'code',
      accessorFn: (row) => row.code,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Code' />
      ),
      cell: ({ row }) => {
        const code = row.original.code
        return code ? (
          <Badge
            variant='outline'
            className='font-mono text-xs font-semibold tracking-wider uppercase'
          >
            {code}
          </Badge>
        ) : (
          <span className='text-muted-foreground text-xs italic'>
            Auto-applied
          </span>
        )
      },
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
      cell: ({ row }) => (
        <Badge
          variant={row.original.type === 'percentage' ? 'default' : 'secondary'}
          className='text-xs font-normal capitalize'
        >
          {row.original.type}
        </Badge>
      ),
    },
    {
      id: 'amount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Value' />
      ),
      cell: ({ row }) => {
        const { type, basisPoints, amount, currency } = row.original
        if (type === 'percentage' && basisPoints != null) {
          return (
            <span className='text-sm font-semibold text-emerald-600 dark:text-emerald-400'>
              {(basisPoints / 100).toFixed(0)}% OFF
            </span>
          )
        }
        if (type === 'fixed' && amount != null) {
          return (
            <span className='text-sm font-semibold text-emerald-600 dark:text-emerald-400'>
              ${(amount / 100).toFixed(2)} {(currency || 'USD').toUpperCase()}{' '}
              OFF
            </span>
          )
        }
        return <span className='text-muted-foreground text-xs'>-</span>
      },
    },
    {
      id: 'duration',
      accessorFn: (row) => row.duration,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Duration' />
      ),
      cell: ({ row }) => {
        const { duration, durationInMonths } = row.original
        let text: string = duration
        if (duration === 'repeating' && durationInMonths) {
          text = `${durationInMonths} mos`
        }
        return (
          <span className='text-muted-foreground font-mono text-xs capitalize'>
            {text}
          </span>
        )
      },
    },
    {
      id: 'redemptions',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Redemptions' />
      ),
      cell: ({ row }) => {
        const { redemptionsCount, maxRedemptions } = row.original
        return (
          <span className='font-mono text-xs'>
            {redemptionsCount} / {maxRedemptions ?? '∞'}
          </span>
        )
      },
    },
    {
      id: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Status' />
      ),
      cell: ({ row }) => {
        const { endsAt, maxRedemptions, redemptionsCount } = row.original
        const isExpired = endsAt ? new Date(endsAt) < new Date() : false
        const isDepleted = maxRedemptions
          ? redemptionsCount >= maxRedemptions
          : false
        const isActive = !isExpired && !isDepleted

        return (
          <Badge
            variant={isActive ? 'default' : 'secondary'}
            className='text-xs'
          >
            {isActive ? 'Active' : isExpired ? 'Expired' : 'Depleted'}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      header: () => <span className='text-xs'>Actions</span>,
      cell: ({ row }) => (
        <DiscountRowActions discount={row.original} onEdit={onEdit} />
      ),
    },
  ]
}
