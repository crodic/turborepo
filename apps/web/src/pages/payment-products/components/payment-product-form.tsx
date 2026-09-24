import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  paymentProductFormSchema,
  type PaymentProductFormSchema,
  type PaymentProductSchema,
} from '../schema'

interface PaymentProductFormProps {
  initialData?: PaymentProductSchema
  isSubmitting: boolean
  onSubmit: (data: PaymentProductFormSchema) => void
  onCancel: () => void
}

export function PaymentProductForm({
  initialData,
  isSubmitting,
  onSubmit,
  onCancel,
}: PaymentProductFormProps) {
  const { t } = useTranslation()

  const defaultValues: PaymentProductFormSchema = {
    planSlug: initialData?.planSlug || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    interval: initialData?.interval || 'monthly',
    price: initialData?.price ?? 0,
    currency: initialData?.currency || 'usd',
    polarProductId: initialData?.polarProductId || '',
    featuresText: initialData?.features?.join('\n') || '',
    badge: initialData?.badge || '',
    ctaText: initialData?.ctaText || 'Get Started',
    isPopular: initialData?.isPopular ?? false,
    isFree: initialData?.isFree ?? false,
    isActive: initialData?.isActive ?? true,
    sortOrder: initialData?.sortOrder ?? 0,
  }

  const form = useForm<PaymentProductFormSchema>({
    resolver: zodResolver(paymentProductFormSchema),
    defaultValues,
  })

  const isPolarManaged = Boolean(initialData?.polarProductId)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        {isPolarManaged && (
          <div className='flex items-center gap-2.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-300'>
            <Info className='size-5 shrink-0' />
            <span>
              This plan is synchronized from Polar. Pricing, billing interval,
              and slug are managed directly in the Polar Dashboard to ensure
              data integrity.
            </span>
          </div>
        )}
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
          {/* Basic Plan Info */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Information</CardTitle>
              <CardDescription>
                Define the public identifiers and display details of this plan.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <FormField
                control={form.control}
                name='planSlug'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Slug *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g. starter, pro, enterprise'
                        disabled={isPolarManaged}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Unique tier identifier sent by the frontend for checkout.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name *</FormLabel>
                    <FormControl>
                      <Input placeholder='e.g. Pro Membership' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                <FormField
                  control={form.control}
                  name='interval'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interval *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isPolarManaged}
                      >
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select interval' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='monthly'>Monthly</SelectItem>
                          <SelectItem value='yearly'>Yearly</SelectItem>
                          <SelectItem value='one_time'>
                            One-time (Lifetime)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='currency'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || 'usd'}
                        disabled={isPolarManaged}
                      >
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select currency' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='usd'>USD ($)</SelectItem>
                          <SelectItem value='vnd'>VND (₫)</SelectItem>
                          <SelectItem value='eur'>EUR (€)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='price'
                  render={({ field }) => {
                    const currentCurrency = form.watch('currency') || 'usd'
                    const currencyUpper = currentCurrency.toUpperCase()
                    return (
                      <FormItem>
                        <FormLabel>Price ({currencyUpper}) *</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min='0'
                            step='1'
                            disabled={isPolarManaged}
                            placeholder={
                              currentCurrency === 'vnd' ? '499000' : '19'
                            }
                            value={field.value}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ''
                                  ? 0
                                  : Number(e.target.value)
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
              </div>

              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Short subtitle or description of who this plan is for.'
                        rows={3}
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Integration & Polar Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Polar Payment Gateway</CardTitle>
              <CardDescription>
                Map this tier to Polar.sh product secrets and control billing
                behavior.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <FormField
                control={form.control}
                name='polarProductId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Polar Product ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g. f6387289-7bfc-42cc-8e85-00d4a922dc9f'
                        className='font-mono text-sm'
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Product UUID from Polar Dashboard. Leave empty if this is
                      a free plan.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='badge'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Highlight Badge</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g. Most Popular'
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='ctaText'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Label</FormLabel>
                      <FormControl>
                        <Input placeholder='e.g. Upgrade to Pro' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='sortOrder'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min='0'
                        step='1'
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === '' ? 0 : Number(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Lower numbers appear first on the pricing page.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='flex flex-col gap-3 rounded-lg border p-4'>
                <FormField
                  control={form.control}
                  name='isPopular'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between'>
                      <div>
                        <FormLabel className='text-sm font-medium'>
                          Highlighted / Popular
                        </FormLabel>
                        <FormDescription className='text-xs'>
                          Add prominent visual border & accent styling
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='isFree'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between'>
                      <div>
                        <FormLabel className='text-sm font-medium'>
                          Free Plan
                        </FormLabel>
                        <FormDescription className='text-xs'>
                          Skips payment gateway redirect
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='isActive'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between'>
                      <div>
                        <FormLabel className='text-sm font-medium'>
                          Active & Visible
                        </FormLabel>
                        <FormDescription className='text-xs'>
                          Make available for purchase on client website
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features List */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Features</CardTitle>
            <CardDescription>
              Enter one feature bullet point per line.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name='featuresText'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder={
                        'Unlimited workspaces\nPriority 24/7 support\nHigh-speed API limit'
                      }
                      rows={6}
                      className='font-mono text-sm'
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className='flex items-center justify-end gap-3'>
          <Button
            type='button'
            variant='outline'
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t('buttons.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button type='submit' disabled={isSubmitting}>
            {isSubmitting && <Loader2 className='mr-2 size-4 animate-spin' />}
            {initialData
              ? t('buttons.save', { defaultValue: 'Save Changes' })
              : t('buttons.create', { defaultValue: 'Create Product' })}
          </Button>
        </div>
      </form>
    </Form>
  )
}
