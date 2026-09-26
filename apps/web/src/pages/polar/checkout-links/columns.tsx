import { useState } from 'react'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Check, Copy, ExternalLink, MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { useMutationDeleteCheckoutLink } from '../queries'
import type { PolarCheckoutLinkSchema } from '../schema'

function CheckoutLinkRowActions({ link }: { link: PolarCheckoutLinkSchema }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const deleteMutation = useMutationDeleteCheckoutLink()

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
            Delete Link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Checkout Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate and remove this checkout link?
              Customers clicking this link will no longer be able to purchase.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(link.id)}
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

function CopyableUrlCell({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Checkout link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className='flex max-w-sm items-center gap-1.5'>
      <span className='text-muted-foreground truncate font-mono text-xs select-all'>
        {url}
      </span>
      <Button
        variant='ghost'
        size='icon'
        className='size-6 shrink-0'
        onClick={handleCopy}
        title='Copy link'
      >
        {copied ? (
          <Check className='size-3 text-emerald-600' />
        ) : (
          <Copy className='text-muted-foreground size-3' />
        )}
      </Button>
      <a
        href={url}
        target='_blank'
        rel='noopener noreferrer'
        className='inline-flex'
        title='Open link'
      >
        <Button variant='ghost' size='icon' className='size-6 shrink-0'>
          <ExternalLink className='text-muted-foreground size-3' />
        </Button>
      </a>
    </div>
  )
}

export function getCheckoutLinksTableColumns(): ColumnDef<PolarCheckoutLinkSchema>[] {
  return [
    {
      id: 'label',
      accessorFn: (row) => row.label || row.id,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Label / Title' />
      ),
      cell: ({ row }) => (
        <span className='text-sm font-medium'>
          {row.original.label || 'Direct Link'}
        </span>
      ),
    },
    {
      id: 'productId',
      accessorFn: (row) => row.productId,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Product' />
      ),
      cell: ({ row }) => (
        <span className='text-muted-foreground font-mono text-xs'>
          {row.original.productId || '-'}
        </span>
      ),
    },
    {
      id: 'url',
      accessorFn: (row) => row.url,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Checkout Link' />
      ),
      cell: ({ row }) => <CopyableUrlCell url={row.original.url} />,
    },
    {
      id: 'successUrl',
      accessorFn: (row) => row.successUrl,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label='Success URL' />
      ),
      cell: ({ row }) => (
        <span className='text-muted-foreground block max-w-50 truncate font-mono text-xs'>
          {row.original.successUrl || '-'}
        </span>
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
      cell: ({ row }) => <CheckoutLinkRowActions link={row.original} />,
    },
  ]
}
