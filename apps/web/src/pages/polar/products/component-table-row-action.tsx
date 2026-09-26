import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Row } from '@tanstack/react-table'
import { Edit2Icon, MoreHorizontalIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeleteAlertDialog } from '@/components/common/delete-alert-dialog'
import { apiDeletePaymentProduct, paymentProductQueryKeys } from './queries'
import type { PaymentProductSchema } from './schema'

export default function ComponentTableRowActions({
  row,
}: {
  row: Row<PaymentProductSchema>
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const item = row.original
  const [openDelete, setOpenDelete] = useState(false)
  const { ability } = useAuthStore()
  const canUpdate = ability.can('update', 'PAYMENT_PRODUCT')
  const canDelete = ability.can('delete', 'PAYMENT_PRODUCT')

  const deleteMutation = useMutation({
    mutationFn: apiDeletePaymentProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentProductQueryKeys.all })
      toast.success(
        t('paymentProducts.deleteSuccess', {
          defaultValue: 'Payment product deleted successfully',
        })
      )
      setOpenDelete(false)
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to delete product')
    },
  })

  if (!canUpdate && !canDelete) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon'>
            <MoreHorizontalIcon className='size-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          {canUpdate && (
            <DropdownMenuItem
              onClick={() => navigate(`/polar/products/${item.id}/edit`)}
            >
              <Edit2Icon className='size-4' />
              {t('buttons.edit', { defaultValue: 'Edit' })}
            </DropdownMenuItem>
          )}

          {canUpdate && canDelete && <DropdownMenuSeparator />}

          {canDelete && (
            <DropdownMenuItem
              className='text-destructive focus:text-destructive'
              onClick={() => setOpenDelete(true)}
            >
              <Trash2Icon className='size-4' />
              {t('buttons.delete', { defaultValue: 'Delete' })}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteAlertDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
        handleDelete={() => deleteMutation.mutate(item.id)}
        isLoading={deleteMutation.isPending}
        title={t('paymentProducts.deleteTitle', {
          defaultValue: `Delete plan "${item.name}" (${item.interval})?`,
        })}
        description={t('paymentProducts.deleteDesc', {
          defaultValue:
            'Are you sure you want to remove this pricing plan? If it has existing orders, it will be safely archived on Polar to preserve existing subscriptions. If it has no orders, it will be permanently deleted.',
        })}
      />
    </>
  )
}
