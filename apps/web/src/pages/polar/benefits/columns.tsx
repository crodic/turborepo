import { useState } from 'react'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, ShieldCheck, Trash2 } from 'lucide-react'
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
import { useMutationDeleteBenefit } from '../queries'
import type { PolarBenefitSchema } from '../schema'

interface BenefitRowActionsProps {
  benefit: PolarBenefitSchema
  onViewGrants: (benefit: PolarBenefitSchema) => void
}

function BenefitRowActions({ benefit, onViewGrants }: BenefitRowActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const deleteMutation = useMutationDeleteBenefit()

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
          <DropdownMenuItem onClick={() => onViewGrants(benefit)}>
            <ShieldCheck className='text-muted-foreground mr-2 size-4' />
            View Active Grants
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className='text-destructive focus:text-destructive'
          >
            <Trash2 className='mr-2 size-4' />
            Delete Benefit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Polar Benefit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete benefit &quot;
              {benefit.description}&quot;? This will unbind it from any
              associated products on Polar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(benefit.id)}
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

const benefitTypeVariant: Record<string, string> = {
  custom: 'secondary',
  license_keys: 'default',
  discord: 'outline',
  github: 'outline',
  downloadables: 'secondary',
}

export function getBenefitsTableColumns({
  onViewGrants,
}: {
  onViewGrants: (benefit: PolarBenefitSchema) => void
}): ColumnDef<PolarBenefitSchema>[] {
  return [
    {
      id: 'type',
      accessorFn: (row) => row.type,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Type' />
      ),
      cell: ({ row }) => {
        const type = row.original.type
        return (
          <Badge
            variant={(benefitTypeVariant[type] as any) || 'secondary'}
            className='font-mono text-xs capitalize'
          >
            {type.replace('_', ' ')}
          </Badge>
        )
      },
    },
    {
      id: 'description',
      accessorFn: (row) => row.description,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Description / Title' />
      ),
      cell: ({ row }) => (
        <span className='text-sm font-medium'>{row.original.description}</span>
      ),
    },
    {
      id: 'isTaxApplicable',
      accessorFn: (row) => row.isTaxApplicable,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Tax Applicable' />
      ),
      cell: ({ row }) => (
        <Badge
          variant={row.original.isTaxApplicable ? 'default' : 'outline'}
          className='text-xs'
        >
          {row.original.isTaxApplicable ? 'Taxable' : 'Tax Exempt'}
        </Badge>
      ),
    },
    {
      id: 'createdAt',
      accessorFn: (row) => row.createdAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Created' />
      ),
      cell: ({ row }) => (
        <span className='text-muted-foreground text-xs'>
          {row.original.createdAt
            ? format(new Date(row.original.createdAt), 'dd/MM/yyyy')
            : '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className='text-xs'>Actions</span>,
      cell: ({ row }) => (
        <BenefitRowActions benefit={row.original} onViewGrants={onViewGrants} />
      ),
    },
  ]
}
