import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { PaymentProductForm } from '../components/payment-product-form'
import {
  apiUpdatePaymentProduct,
  paymentProductQueryKeys,
  useDataPaymentProductById,
} from '../queries'
import type { PaymentProductFormSchema } from '../schema'

export function PagePaymentProductEdit() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data: product, isLoading } = useDataPaymentProductById(id || '')

  const updateMutation = useMutation({
    mutationFn: apiUpdatePaymentProduct,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentProductQueryKeys.all })
      queryClient.invalidateQueries({
        queryKey: paymentProductQueryKeys.detail(id!),
      })
      toast.success(
        t('paymentProducts.updateSuccess', {
          name: data.name,
          defaultValue: `Plan "${data.name}" updated successfully`,
        })
      )
      navigate('/polar/products')
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to update plan'
      )
    },
  })

  const handleSubmit = (formData: PaymentProductFormSchema) => {
    if (!id) return
    updateMutation.mutate({ id, data: formData })
  }

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-6'>
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => navigate('/polar/products')}
          >
            <ArrowLeft className='size-5' />
          </Button>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              {t('paymentProducts.editTitle', {
                defaultValue: 'Edit Pricing Plan',
              })}
            </h2>
            <p className='text-muted-foreground text-sm'>
              {t('paymentProducts.editDescription', {
                defaultValue:
                  'Update plan pricing, features, and Polar Product ID integration.',
              })}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className='flex h-64 items-center justify-center'>
            <Loader2 className='text-primary size-8 animate-spin' />
          </div>
        ) : product ? (
          <PaymentProductForm
            initialData={product}
            isSubmitting={updateMutation.isPending}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/polar/products')}
          />
        ) : (
          <div className='text-muted-foreground p-8 text-center'>
            Product not found.
          </div>
        )}
      </Main>
    </>
  )
}

export default PagePaymentProductEdit
