import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { PaymentProductForm } from '../components/payment-product-form'
import { apiCreatePaymentProduct, paymentProductQueryKeys } from '../queries'
import type { PaymentProductFormSchema } from '../schema'

export function PagePaymentProductCreate() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: apiCreatePaymentProduct,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentProductQueryKeys.all })
      toast.success(
        t('paymentProducts.createSuccess', {
          name: data.name,
          defaultValue: `Plan "${data.name}" created successfully`,
        })
      )
      navigate('/polar/products')
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to create plan'
      )
    },
  })

  const handleSubmit = (formData: PaymentProductFormSchema) => {
    createMutation.mutate(formData)
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
              {t('paymentProducts.createTitle', {
                defaultValue: 'Create Pricing Plan',
              })}
            </h2>
            <p className='text-muted-foreground text-sm'>
              {t('paymentProducts.createDescription', {
                defaultValue:
                  'Add a new subscription tier with Polar Product ID integration.',
              })}
            </p>
          </div>
        </div>

        <PaymentProductForm
          isSubmitting={createMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/polar/products')}
        />
      </Main>
    </>
  )
}

export default PagePaymentProductCreate
