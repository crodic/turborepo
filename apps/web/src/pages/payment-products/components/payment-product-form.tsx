import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  CalendarSync,
  Gift,
  Globe,
  Info,
  Loader2,
  Lock,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useDataPolarBenefits } from '../queries'
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
  const { data: polarBenefits = [], isLoading: isLoadingBenefits } =
    useDataPolarBenefits()

  const initialBenefitIds = initialData?.benefits
    ? initialData.benefits
        .map((b: any) => (typeof b === 'string' ? b : b?.id))
        .filter(Boolean)
    : []

  const isEditing = Boolean(initialData)
  const isPolarManaged = Boolean(initialData?.polarProductId)

  const defaultValues: PaymentProductFormSchema = {
    planSlug: initialData?.planSlug || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    billingType:
      initialData?.interval === 'one_time' ? 'one_time' : 'recurring',
    interval: initialData?.interval || 'monthly',
    price: initialData?.price ?? 0,
    currency: initialData?.currency || 'usd',
    visibility: (initialData?.visibility as 'public' | 'private') || 'public',
    benefits: initialBenefitIds,
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

  const watchedBillingType = form.watch('billingType')
  const watchedIsFree = form.watch('isFree')
  const watchedCurrency = form.watch('currency') || 'usd'
  const watchedBenefits = form.watch('benefits') || []

  const handleToggleBenefit = (benefitId: string) => {
    if (watchedBenefits.includes(benefitId)) {
      form.setValue(
        'benefits',
        watchedBenefits.filter((id) => id !== benefitId),
        { shouldValidate: true, shouldDirty: true }
      )
    } else {
      form.setValue('benefits', [...watchedBenefits, benefitId], {
        shouldValidate: true,
        shouldDirty: true,
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        {isPolarManaged && (
          <div className='flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-700 dark:text-blue-300'>
            <Info className='mt-0.5 size-5 shrink-0' />
            <div>
              <p className='font-semibold'>
                Synchronized with Polar (ID: {initialData?.polarProductId})
              </p>
              <p className='mt-1 text-xs opacity-90'>
                According to Polar specifications, billing interval and model
                are immutable after creation to protect existing customer
                subscriptions. Price changes only apply to new subscribers.
              </p>
            </div>
          </div>
        )}

        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
          {/* Card 1: Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <span>Basic Information</span>
              </CardTitle>
              <CardDescription>
                Define the public identifiers and details of this product.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g. Pro Membership, Starter Kit'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Name of the product shown to customers at checkout.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='planSlug'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Slug Identifier *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g. starter, pro, enterprise'
                        disabled={isPolarManaged}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Unique slug key used by client apps and metadata mapping.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description / Subtitle</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Brief description of what this product grants.'
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

          {/* Card 2: Pricing & Billing Model */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Billing Cycle</CardTitle>
              <CardDescription>
                Set whether this product is a recurring subscription or one-time
                purchase.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* Billing Type Selector */}
              <FormField
                control={form.control}
                name='billingType'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Type *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(val) => {
                          field.onChange(val)
                          if (val === 'one_time') {
                            form.setValue('interval', 'one_time')
                          } else if (
                            form.getValues('interval') === 'one_time'
                          ) {
                            form.setValue('interval', 'monthly')
                          }
                        }}
                        value={field.value}
                        disabled={isPolarManaged}
                        className='grid grid-cols-2 gap-3'
                      >
                        <label
                          htmlFor='type-recurring'
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                            field.value === 'recurring'
                              ? 'border-primary bg-primary/5 ring-primary ring-1'
                              : 'hover:bg-muted/50'
                          } ${isPolarManaged ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          <RadioGroupItem
                            value='recurring'
                            id='type-recurring'
                            className='mt-1'
                          />
                          <div>
                            <div className='flex items-center gap-1.5 font-medium'>
                              <CalendarSync className='text-primary size-4' />
                              <span>Subscription</span>
                            </div>
                            <p className='text-muted-foreground mt-0.5 text-xs'>
                              Recurring payment on a monthly or yearly cycle.
                            </p>
                          </div>
                        </label>

                        <label
                          htmlFor='type-onetime'
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                            field.value === 'one_time'
                              ? 'border-primary bg-primary/5 ring-primary ring-1'
                              : 'hover:bg-muted/50'
                          } ${isPolarManaged ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          <RadioGroupItem
                            value='one_time'
                            id='type-onetime'
                            className='mt-1'
                          />
                          <div>
                            <div className='flex items-center gap-1.5 font-medium'>
                              <Zap className='size-4 text-amber-500' />
                              <span>One-time</span>
                            </div>
                            <p className='text-muted-foreground mt-0.5 text-xs'>
                              Customer pays once for lifetime or product access.
                            </p>
                          </div>
                        </label>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Interval (if recurring) */}
              {watchedBillingType === 'recurring' && (
                <FormField
                  control={form.control}
                  name='interval'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Interval *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isPolarManaged}
                      >
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select interval' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='monthly'>
                            Monthly billing
                          </SelectItem>
                          <SelectItem value='yearly'>
                            Yearly (Annual) billing
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Currency & Price */}
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='currency'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || 'usd'}
                        disabled={isPolarManaged || watchedIsFree}
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
                          <SelectItem value='gbp'>GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='price'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Price ({watchedCurrency.toUpperCase()}) *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min='0'
                          step='1'
                          disabled={watchedIsFree}
                          placeholder={
                            watchedCurrency === 'vnd' ? '499000' : '19'
                          }
                          value={watchedIsFree ? 0 : field.value}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === '' ? 0 : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Free Tier Switch */}
              <FormField
                control={form.control}
                name='isFree'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                    <div>
                      <FormLabel className='text-sm font-medium'>
                        Free Tier (Lead Magnet)
                      </FormLabel>
                      <FormDescription className='text-xs'>
                        No charge. Skips payment gateway and allows instant
                        access.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked)
                          if (checked) form.setValue('price', 0)
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {/* Card 3: Automated Benefits (Polar Entitlements) */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Gift className='size-5 text-indigo-500' />
              <span>Automated Benefits</span>
            </CardTitle>
            <CardDescription>
              Select entitlements to automatically grant to customers upon
              purchase (synced directly from Polar).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBenefits ? (
              <div className='text-muted-foreground flex items-center gap-2 py-4 text-sm'>
                <Loader2 className='size-4 animate-spin' />
                <span>Loading available benefits from Polar...</span>
              </div>
            ) : polarBenefits.length === 0 ? (
              <div className='text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm'>
                <p>No benefits found on your Polar account.</p>
                <p className='mt-1 text-xs'>
                  You can configure Discord, GitHub, License Keys, or File
                  Download benefits on Polar and attach them to products.
                </p>
              </div>
            ) : (
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                {polarBenefits.map((benefit) => {
                  const isChecked = watchedBenefits.includes(benefit.id)
                  return (
                    <div
                      key={benefit.id}
                      className={`flex items-start justify-between rounded-lg border p-3.5 transition-colors ${
                        isChecked
                          ? 'border-indigo-500/50 bg-indigo-50/40 dark:bg-indigo-950/20'
                          : 'hover:bg-muted/40'
                      }`}
                    >
                      <div className='space-y-1 pr-3'>
                        <div className='flex items-center gap-2'>
                          <Badge
                            variant='outline'
                            className='text-xs uppercase'
                          >
                            {benefit.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className='text-sm leading-snug font-medium'>
                          {benefit.description}
                        </p>
                        <p className='text-muted-foreground font-mono text-xs'>
                          ID: {benefit.id}
                        </p>
                      </div>
                      <Switch
                        checked={isChecked}
                        onCheckedChange={() => handleToggleBenefit(benefit.id)}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Customer Portal & Visibility */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Portal & Visibility</CardTitle>
            <CardDescription>
              Control whether this product is listed publicly or restricted to
              direct links.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name='visibility'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className='grid grid-cols-1 gap-3 sm:grid-cols-2'
                    >
                      <label
                        htmlFor='vis-public'
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-sm transition-colors ${
                          field.value === 'public'
                            ? 'border-primary bg-primary/5 ring-primary ring-1'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <RadioGroupItem
                          value='public'
                          id='vis-public'
                          className='mt-1'
                        />
                        <div>
                          <div className='flex items-center gap-1.5 font-medium'>
                            <Globe className='size-4 text-emerald-500' />
                            <span>Public Storefront</span>
                          </div>
                          <p className='text-muted-foreground mt-0.5 text-xs'>
                            Product is listed in Customer Portal and public
                            pricing catalog.
                          </p>
                        </div>
                      </label>

                      <label
                        htmlFor='vis-private'
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-sm transition-colors ${
                          field.value === 'private'
                            ? 'border-primary bg-primary/5 ring-primary ring-1'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <RadioGroupItem
                          value='private'
                          id='vis-private'
                          className='mt-1'
                        />
                        <div>
                          <div className='flex items-center gap-1.5 font-medium'>
                            <Lock className='size-4 text-amber-500' />
                            <span>Private (Unlisted)</span>
                          </div>
                          <p className='text-muted-foreground mt-0.5 text-xs'>
                            Hidden from public catalog. Customers can only buy
                            via direct link.
                          </p>
                        </div>
                      </label>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Card 5: Marketing & Landing Page */}
        <Card>
          <CardHeader>
            <CardTitle>Landing Page & Marketing Display</CardTitle>
            <CardDescription>
              Configure feature bullet points, highlight badges, and
              presentation details.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
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
                    <FormLabel>Button Label (CTA) *</FormLabel>
                    <FormControl>
                      <Input placeholder='e.g. Upgrade to Pro' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='isPopular'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                    <div>
                      <div className='flex items-center gap-1.5 text-sm font-medium'>
                        <Sparkles className='size-4 text-amber-500' />
                        <span>Highlighted / Popular</span>
                      </div>
                      <FormDescription className='text-xs'>
                        Add prominent accent border & badge on the pricing table
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
                  <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                    <div>
                      <FormLabel className='text-sm font-medium'>
                        Active Status
                      </FormLabel>
                      <FormDescription className='text-xs'>
                        Allow purchases on the frontend website
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

            <FormField
              control={form.control}
              name='featuresText'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feature Bullet Points</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        'Unlimited workspaces\nPriority 24/7 support\nHigh-speed API limits'
                      }
                      rows={5}
                      className='font-mono text-sm'
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter one feature per line. These will render as checklist
                    bullets.
                  </FormDescription>
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
            {isEditing
              ? t('buttons.save', { defaultValue: 'Save & Sync Changes' })
              : t('buttons.create', { defaultValue: 'Create & Sync to Polar' })}
          </Button>
        </div>
      </form>
    </Form>
  )
}
