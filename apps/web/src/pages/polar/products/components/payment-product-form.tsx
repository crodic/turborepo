import { useCallback, useMemo, useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  CalendarSync,
  ChevronDown,
  ChevronUp,
  Gift,
  Globe,
  ImagePlus,
  Info,
  Loader2,
  Lock,
  Plus,
  Sparkles,
  Tags,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
import { apiUploadProductMedia, useDataPolarBenefits } from '../queries'
import {
  paymentProductFormSchema,
  type PaymentProductFormSchema,
  type PaymentProductSchema,
  type PolarBenefitSchema,
  type ProductMediaSchema,
} from '../schema'
import { CreateBenefitDialog } from './create-benefit-dialog'

// --- Constants ---

const AVAILABLE_CURRENCIES = [
  { value: 'usd', label: 'USD ($)', symbol: '$' },
  { value: 'vnd', label: 'VND (₫)', symbol: '₫' },
  { value: 'eur', label: 'EUR (€)', symbol: '€' },
  { value: 'gbp', label: 'GBP (£)', symbol: '£' },
  { value: 'jpy', label: 'JPY (¥)', symbol: '¥' },
] as const

const INTERVAL_OPTIONS = [
  { value: 'daily', label: 'Day' },
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
  { value: 'yearly', label: 'Year' },
] as const

// --- Props ---

interface PaymentProductFormProps {
  initialData?: PaymentProductSchema
  isSubmitting: boolean
  onSubmit: (data: PaymentProductFormSchema) => void
  onCancel: () => void
}

// --- Helpers ---

function buildInitialPrices(
  initialData?: PaymentProductSchema
): Array<{ amount: number; currency: string }> {
  if (initialData?.prices && initialData.prices.length > 0) {
    // Filter out archived prices
    const activePrices = initialData.prices.filter((p) => !p.isArchived)
    if (activePrices.length > 0) {
      return activePrices.map((p) => ({
        amount: p.amount,
        currency: p.currency,
      }))
    }
  }
  return [
    {
      amount: initialData?.price ?? 0,
      currency: initialData?.currency || 'usd',
    },
  ]
}

function buildInitialMetadata(
  initialData?: PaymentProductSchema
): Array<{ key: string; value: string }> {
  if (!initialData?.metadata || typeof initialData.metadata !== 'object') {
    return []
  }
  // Filter out internal metadata keys
  const internalKeys = new Set([
    'planSlug',
    'badge',
    'ctaText',
    'cta_text',
    'sortOrder',
    'sort_order',
    'isPopular',
    'tag',
  ])
  return Object.entries(initialData.metadata)
    .filter(([key]) => !internalKeys.has(key))
    .map(([key, value]) => ({ key, value: String(value) }))
}

function normalizeInterval(
  val?: string
): 'daily' | 'weekly' | 'monthly' | 'yearly' | 'one_time' {
  if (!val) return 'monthly'
  const map: Record<
    string,
    'daily' | 'weekly' | 'monthly' | 'yearly' | 'one_time'
  > = {
    day: 'daily',
    daily: 'daily',
    week: 'weekly',
    weekly: 'weekly',
    month: 'monthly',
    monthly: 'monthly',
    year: 'yearly',
    yearly: 'yearly',
    one_time: 'one_time',
  }
  return map[val] || 'monthly'
}

function normalizeTrialInterval(
  val?: string | null
): 'daily' | 'weekly' | 'monthly' | 'yearly' | undefined {
  if (!val) return undefined
  const map: Record<string, 'daily' | 'weekly' | 'monthly' | 'yearly'> = {
    day: 'daily',
    daily: 'daily',
    week: 'weekly',
    weekly: 'weekly',
    month: 'monthly',
    monthly: 'monthly',
    year: 'yearly',
    yearly: 'yearly',
  }
  return map[val]
}

// --- Component ---

export function PaymentProductForm({
  initialData,
  isSubmitting,
  onSubmit,
  onCancel,
}: PaymentProductFormProps) {
  const { t } = useTranslation()
  const { data: polarBenefits = [], isLoading: isLoadingBenefits } =
    useDataPolarBenefits()

  const [createBenefitOpen, setCreateBenefitOpen] = useState(false)

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
    interval: normalizeInterval(initialData?.interval),
    intervalCount: initialData?.intervalCount ?? 1,
    prices: buildInitialPrices(initialData),
    trialEnabled: Boolean(initialData?.trialInterval),
    trialInterval: normalizeTrialInterval(initialData?.trialInterval),
    trialIntervalCount: initialData?.trialIntervalCount ?? 1,
    metadata: buildInitialMetadata(initialData),
    benefits: initialBenefitIds,
    visibility: (initialData?.visibility as 'public' | 'private') || 'public',
    polarProductId: initialData?.polarProductId || '',
    medias: (initialData?.medias as ProductMediaSchema[]) || [],
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

  const {
    fields: priceFields,
    append: appendPrice,
    remove: removePrice,
  } = useFieldArray({ control: form.control, name: 'prices' })

  const {
    fields: metadataFields,
    append: appendMetadata,
    remove: removeMetadata,
  } = useFieldArray({ control: form.control, name: 'metadata' })

  const {
    fields: mediaFields,
    append: appendMedia,
    remove: removeMedia,
  } = useFieldArray({ control: form.control, name: 'medias' })

  const [checkoutPageOpen, setCheckoutPageOpen] = useState(true)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const mediaFileInputRef = useRef<HTMLInputElement>(null)

  const handleMediaUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit')
      return
    }

    try {
      setIsUploadingMedia(true)
      const res = await apiUploadProductMedia(file)
      appendMedia({
        id: res.id,
        publicUrl: res.publicUrl,
        name: res.name,
        size: res.size,
        mimeType: res.mimeType,
      })
      toast.success(`Media "${res.name}" uploaded successfully`)
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to upload media'
      )
    } finally {
      setIsUploadingMedia(false)
      if (mediaFileInputRef.current) {
        mediaFileInputRef.current.value = ''
      }
    }
  }

  const watchedBillingType = form.watch('billingType')
  const watchedIsFree = form.watch('isFree')
  const rawWatchedBenefits = form.watch('benefits')
  const watchedBenefits = useMemo(
    () => rawWatchedBenefits || [],
    [rawWatchedBenefits]
  )
  const watchedTrialEnabled = form.watch('trialEnabled')
  const watchedPrices = form.watch('prices')

  // Currencies already used in the prices array
  const usedCurrencies = new Set(watchedPrices.map((p) => p.currency))
  const availableCurrenciesToAdd = AVAILABLE_CURRENCIES.filter(
    (c) => !usedCurrencies.has(c.value)
  )

  const handleToggleBenefit = useCallback(
    (benefitId: string) => {
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
    },
    [form, watchedBenefits]
  )

  const handleBenefitCreated = useCallback(
    (benefit: PolarBenefitSchema) => {
      // Auto-select the newly created benefit
      form.setValue('benefits', [...watchedBenefits, benefit.id], {
        shouldValidate: true,
        shouldDirty: true,
      })
    },
    [form, watchedBenefits]
  )

  const handleAddCurrency = useCallback(
    (currency: string) => {
      appendPrice({ amount: 0, currency })
    },
    [appendPrice]
  )

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          {isPolarManaged && (
            <div className='flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-700 dark:text-blue-300'>
              <Info className='mt-0.5 size-5 shrink-0' />
              <div>
                <p className='font-semibold'>
                  {t('paymentProducts.polarSynced', {
                    id: initialData?.polarProductId,
                    defaultValue: `Synchronized with Polar (ID: ${initialData?.polarProductId})`,
                  })}
                </p>
                <p className='mt-1 text-xs opacity-90'>
                  {t('paymentProducts.polarImmutableNote', {
                    defaultValue:
                      'Billing interval and model are immutable after creation. Price changes only apply to new subscribers.',
                  })}
                </p>
              </div>
            </div>
          )}

          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
            {/* ====== Card 1: Basic Information ====== */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {t('paymentProducts.basicInfo', {
                    defaultValue: 'Basic Information',
                  })}
                </CardTitle>
                <CardDescription>
                  {t('paymentProducts.basicInfoDesc', {
                    defaultValue:
                      'Define the public identifiers and details of this product.',
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('paymentProducts.productName', {
                          defaultValue: 'Product Name',
                        })}{' '}
                        *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g. Pro Membership, Starter Kit'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='planSlug'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('paymentProducts.planSlug', {
                          defaultValue: 'Plan Slug',
                        })}{' '}
                        *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g. starter, pro, enterprise'
                          disabled={isPolarManaged}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className='text-xs'>
                        {t('paymentProducts.planSlugDesc', {
                          defaultValue:
                            'Unique slug key used by client apps and metadata mapping.',
                        })}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* ====== Card: Checkout Page (Presentation & Images) ====== */}
            <Card className='md:col-span-2'>
              <CardHeader
                className='hover:bg-muted/10 cursor-pointer transition-colors select-none'
                onClick={() => setCheckoutPageOpen((prev) => !prev)}
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <CardTitle className='text-lg font-semibold tracking-tight'>
                      Checkout Page
                    </CardTitle>
                    <CardDescription className='mt-1 text-xs sm:text-sm'>
                      Customize how this product is presented during checkout
                    </CardDescription>
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='text-muted-foreground size-8 p-0'
                  >
                    {checkoutPageOpen ? (
                      <ChevronUp className='size-5' />
                    ) : (
                      <ChevronDown className='size-5' />
                    )}
                  </Button>
                </div>
              </CardHeader>

              {checkoutPageOpen && (
                <CardContent className='space-y-6 pt-0'>
                  {/* Description field with Markdown format hint */}
                  <FormField
                    control={form.control}
                    name='description'
                    render={({ field }) => (
                      <FormItem>
                        <div className='flex items-center justify-between'>
                          <FormLabel className='text-sm font-medium'>
                            {t('paymentProducts.description', {
                              defaultValue: 'Description',
                            })}
                          </FormLabel>
                          <span className='text-muted-foreground text-xs'>
                            Markdown format
                          </span>
                        </div>
                        <FormControl>
                          <Textarea
                            placeholder='Write a markdown description for the checkout page...'
                            rows={5}
                            className='bg-muted/20 resize-y font-mono text-sm'
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Product Images section */}
                  <div className='space-y-3'>
                    <label className='text-sm font-medium'>
                      Product images
                    </label>

                    <div className='flex flex-wrap items-center gap-4 pt-1'>
                      {mediaFields.map((media, index) => {
                        const mediaUrl =
                          (media as any).publicUrl ||
                          (media as any).public_url ||
                          (media as any).path ||
                          ''
                        return (
                          <div
                            key={media.id || index}
                            className='bg-muted/40 relative aspect-video w-52 overflow-visible rounded-xl border shadow-sm sm:w-60'
                          >
                            <div className='h-full w-full overflow-hidden rounded-xl'>
                              {mediaUrl ? (
                                <img
                                  src={mediaUrl}
                                  alt={
                                    (media as any).name ||
                                    `Product media ${index + 1}`
                                  }
                                  className='h-full w-full object-cover'
                                />
                              ) : (
                                <div className='text-muted-foreground flex h-full w-full flex-col items-center justify-center p-2 text-center text-xs'>
                                  <span>
                                    {(media as any).name || 'Media file'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation()
                                removeMedia(index)
                              }}
                              className='absolute -top-2 -right-2 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white shadow-md transition-transform hover:scale-110 hover:bg-red-700'
                              title='Remove media'
                            >
                              <X className='size-3.5 stroke-3' />
                            </button>
                          </div>
                        )
                      })}

                      {/* Add product media card */}
                      <div
                        onClick={() => {
                          if (!isUploadingMedia) {
                            mediaFileInputRef.current?.click()
                          }
                        }}
                        className='border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-muted/40 group flex aspect-video w-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-all sm:w-60'
                      >
                        {isUploadingMedia ? (
                          <div className='flex flex-col items-center gap-2'>
                            <Loader2 className='text-primary size-6 animate-spin' />
                            <span className='text-muted-foreground text-xs'>
                              Uploading...
                            </span>
                          </div>
                        ) : (
                          <>
                            <ImagePlus className='text-muted-foreground group-hover:text-primary mb-1.5 size-7 transition-colors' />
                            <span className='text-sm font-medium'>
                              Add product media
                            </span>
                            <span className='text-muted-foreground mt-1 text-[11px] leading-snug'>
                              Up to 10MB each. 16:9 ratio recommended for
                              optimal display.
                            </span>
                          </>
                        )}
                        <input
                          ref={mediaFileInputRef}
                          type='file'
                          accept='image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml'
                          className='hidden'
                          onChange={handleMediaUpload}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* ====== Card 2: Pricing & Billing ====== */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {t('paymentProducts.pricingBilling', {
                    defaultValue: 'Pricing & Billing Cycle',
                  })}
                </CardTitle>
                <CardDescription>
                  {t('paymentProducts.pricingBillingDesc', {
                    defaultValue:
                      'Set whether this product is a recurring subscription or one-time purchase.',
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {/* Billing Type */}
                <FormField
                  control={form.control}
                  name='billingType'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('paymentProducts.billingType', {
                          defaultValue: 'Billing Type',
                        })}{' '}
                        *
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(val) => {
                            field.onChange(val)
                            if (val === 'one_time') {
                              form.setValue('interval', 'one_time')
                              form.setValue('trialEnabled', false)
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
                                <span>
                                  {t('paymentProducts.subscription', {
                                    defaultValue: 'Subscription',
                                  })}
                                </span>
                              </div>
                              <p className='text-muted-foreground mt-0.5 text-xs'>
                                {t('paymentProducts.subscriptionDesc', {
                                  defaultValue: 'Recurring payment cycle.',
                                })}
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
                                <span>
                                  {t('paymentProducts.oneTime', {
                                    defaultValue: 'One-time',
                                  })}
                                </span>
                              </div>
                              <p className='text-muted-foreground mt-0.5 text-xs'>
                                {t('paymentProducts.oneTimeDesc', {
                                  defaultValue:
                                    'Customer pays once for lifetime access.',
                                })}
                              </p>
                            </div>
                          </label>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Interval + Interval Count (if recurring) */}
                {watchedBillingType === 'recurring' && (
                  <div className='space-y-2'>
                    <FormLabel>
                      {t('paymentProducts.billingInterval', {
                        defaultValue: 'Billing Interval',
                      })}{' '}
                      *
                    </FormLabel>
                    <div className='flex items-start gap-3'>
                      <FormField
                        control={form.control}
                        name='intervalCount'
                        render={({ field }) => (
                          <FormItem className='w-24'>
                            <FormControl>
                              <Input
                                type='number'
                                min='1'
                                step='1'
                                disabled={isPolarManaged}
                                placeholder='1'
                                value={field.value ?? 1}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value === ''
                                      ? 1
                                      : Number(e.target.value)
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='interval'
                        render={({ field }) => (
                          <FormItem className='flex-1'>
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
                                {INTERVAL_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Multi-Currency Prices */}
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <FormLabel>
                      {t('paymentProducts.prices', {
                        defaultValue: 'Prices',
                      })}{' '}
                      *
                    </FormLabel>
                    <div className='flex gap-1'>
                      {watchedPrices.map((p) => (
                        <Badge
                          key={p.currency}
                          variant='secondary'
                          className='text-xs'
                        >
                          {p.currency.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {priceFields.map((field, index) => {
                    const currencyInfo = AVAILABLE_CURRENCIES.find(
                      (c) => c.value === field.currency
                    )
                    return (
                      <div key={field.id} className='flex items-end gap-2'>
                        <div className='min-w-20'>
                          <Badge variant='outline' className='text-xs'>
                            {currencyInfo?.label ||
                              field.currency.toUpperCase()}
                          </Badge>
                        </div>
                        <FormField
                          control={form.control}
                          name={`prices.${index}.amount`}
                          render={({ field: amountField }) => (
                            <FormItem className='flex-1'>
                              <FormControl>
                                <Input
                                  type='number'
                                  min='0'
                                  step='1'
                                  disabled={watchedIsFree}
                                  placeholder={
                                    field.currency === 'vnd' ? '499000' : '19'
                                  }
                                  value={watchedIsFree ? 0 : amountField.value}
                                  onChange={(e) =>
                                    amountField.onChange(
                                      e.target.value === ''
                                        ? 0
                                        : Number(e.target.value)
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Cannot remove the first (primary) price */}
                        {index > 0 && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='text-destructive size-9 shrink-0'
                            onClick={() => removePrice(index)}
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        )}
                      </div>
                    )
                  })}

                  {availableCurrenciesToAdd.length > 0 && !watchedIsFree && (
                    <Select
                      onValueChange={(val) => handleAddCurrency(val)}
                      value=''
                    >
                      <SelectTrigger className='w-full border-dashed'>
                        <span className='text-muted-foreground flex items-center gap-1.5 text-sm'>
                          <Plus className='size-3.5' />
                          {t('paymentProducts.addCurrency', {
                            defaultValue: 'Add Currency',
                          })}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {availableCurrenciesToAdd.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Free Tier Switch */}
                <FormField
                  control={form.control}
                  name='isFree'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                      <div>
                        <FormLabel className='text-sm font-medium'>
                          {t('paymentProducts.freeTier', {
                            defaultValue: 'Free Tier',
                          })}
                        </FormLabel>
                        <FormDescription className='text-xs'>
                          {t('paymentProducts.freeTierDesc', {
                            defaultValue: 'No charge. Skips payment gateway.',
                          })}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            if (checked) {
                              // Set all prices to 0
                              const currentPrices = form.getValues('prices')
                              currentPrices.forEach((_, i) => {
                                form.setValue(`prices.${i}.amount`, 0)
                              })
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Trial Period (recurring only) */}
                {watchedBillingType === 'recurring' && (
                  <>
                    <FormField
                      control={form.control}
                      name='trialEnabled'
                      render={({ field }) => (
                        <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                          <div>
                            <FormLabel className='text-sm font-medium'>
                              {t('paymentProducts.trialPeriod', {
                                defaultValue: 'Free Trial Period',
                              })}
                            </FormLabel>
                            <FormDescription className='text-xs'>
                              {t('paymentProducts.trialPeriodDesc', {
                                defaultValue:
                                  'Allow customers to try before they pay.',
                              })}
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

                    {watchedTrialEnabled && (
                      <div className='space-y-2'>
                        <FormLabel>
                          {t('paymentProducts.trialDuration', {
                            defaultValue: 'Trial Duration',
                          })}
                        </FormLabel>
                        <div className='flex items-start gap-3'>
                          <FormField
                            control={form.control}
                            name='trialIntervalCount'
                            render={({ field }) => (
                              <FormItem className='w-24'>
                                <FormControl>
                                  <Input
                                    type='number'
                                    min='1'
                                    step='1'
                                    placeholder='7'
                                    value={field.value ?? 1}
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value === ''
                                          ? 1
                                          : Number(e.target.value)
                                      )
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name='trialInterval'
                            render={({ field }) => (
                              <FormItem className='flex-1'>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value || ''}
                                >
                                  <FormControl>
                                    <SelectTrigger className='w-full'>
                                      <SelectValue placeholder='Select unit' />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {INTERVAL_OPTIONS.map((opt) => (
                                      <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                      >
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ====== Card 3: Benefits ====== */}
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <Gift className='size-5 text-indigo-500' />
                    <span>
                      {t('paymentProducts.benefits', {
                        defaultValue: 'Automated Benefits',
                      })}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {t('paymentProducts.benefitsDesc', {
                      defaultValue:
                        'Select entitlements to automatically grant upon purchase.',
                    })}
                  </CardDescription>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setCreateBenefitOpen(true)}
                >
                  <Plus className='mr-1.5 size-4' />
                  {t('paymentProducts.createBenefit', {
                    defaultValue: 'Create Benefit',
                  })}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingBenefits ? (
                <div className='text-muted-foreground flex items-center gap-2 py-4 text-sm'>
                  <Loader2 className='size-4 animate-spin' />
                  <span>
                    {t('paymentProducts.loadingBenefits', {
                      defaultValue: 'Loading benefits from Polar...',
                    })}
                  </span>
                </div>
              ) : polarBenefits.length === 0 ? (
                <div className='text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm'>
                  <p>
                    {t('paymentProducts.noBenefits', {
                      defaultValue: 'No benefits found on your Polar account.',
                    })}
                  </p>
                  <p className='mt-1 text-xs'>
                    {t('paymentProducts.noBenefitsHint', {
                      defaultValue:
                        'Click "Create Benefit" to add one, or configure them on Polar.',
                    })}
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
                        </div>
                        <Switch
                          checked={isChecked}
                          onCheckedChange={() =>
                            handleToggleBenefit(benefit.id)
                          }
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ====== Card 4: Metadata ====== */}
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <Tags className='size-5 text-teal-500' />
                    <span>
                      {t('paymentProducts.metadata', {
                        defaultValue: 'Metadata',
                      })}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {t('paymentProducts.metadataDesc', {
                      defaultValue:
                        'Custom key-value pairs synced with Polar product metadata.',
                    })}
                  </CardDescription>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => appendMetadata({ key: '', value: '' })}
                >
                  <Plus className='mr-1.5 size-4' />
                  {t('paymentProducts.addMetadata', {
                    defaultValue: 'Add Metadata',
                  })}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {metadataFields.length === 0 ? (
                <div className='text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm'>
                  <p>
                    {t('paymentProducts.noMetadata', {
                      defaultValue: 'No metadata entries.',
                    })}
                  </p>
                  <p className='mt-1 text-xs'>
                    {t('paymentProducts.noMetadataHint', {
                      defaultValue:
                        'Click "Add Metadata" to add key-value pairs.',
                    })}
                  </p>
                </div>
              ) : (
                <div className='space-y-2'>
                  {/* Header */}
                  <div className='text-muted-foreground grid grid-cols-[1fr_1fr_36px] gap-2 px-1 text-xs font-medium'>
                    <span>Key</span>
                    <span>Value</span>
                    <span />
                  </div>
                  {metadataFields.map((field, index) => (
                    <div
                      key={field.id}
                      className='grid grid-cols-[1fr_1fr_36px] gap-2'
                    >
                      <FormField
                        control={form.control}
                        name={`metadata.${index}.key`}
                        render={({ field: keyField }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder='key'
                                className='text-sm'
                                {...keyField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`metadata.${index}.value`}
                        render={({ field: valueField }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder='value'
                                className='text-sm'
                                {...valueField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='text-destructive size-9'
                        onClick={() => removeMetadata(index)}
                      >
                        <Trash2 className='size-4' />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ====== Card 5: Visibility ====== */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t('paymentProducts.visibility', {
                  defaultValue: 'Customer Portal & Visibility',
                })}
              </CardTitle>
              <CardDescription>
                {t('paymentProducts.visibilityDesc', {
                  defaultValue:
                    'Control whether this product is listed publicly.',
                })}
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
                              <span>
                                {t('paymentProducts.public', {
                                  defaultValue: 'Public Storefront',
                                })}
                              </span>
                            </div>
                            <p className='text-muted-foreground mt-0.5 text-xs'>
                              {t('paymentProducts.publicDesc', {
                                defaultValue:
                                  'Listed in Customer Portal and pricing catalog.',
                              })}
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
                              <span>
                                {t('paymentProducts.private', {
                                  defaultValue: 'Private (Unlisted)',
                                })}
                              </span>
                            </div>
                            <p className='text-muted-foreground mt-0.5 text-xs'>
                              {t('paymentProducts.privateDesc', {
                                defaultValue:
                                  'Hidden from catalog. Buy via direct link only.',
                              })}
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

          {/* ====== Card 6: Marketing ====== */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t('paymentProducts.marketing', {
                  defaultValue: 'Landing Page & Marketing',
                })}
              </CardTitle>
              <CardDescription>
                {t('paymentProducts.marketingDesc', {
                  defaultValue:
                    'Feature bullets, badges, and presentation details.',
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                <FormField
                  control={form.control}
                  name='badge'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('paymentProducts.badge', {
                          defaultValue: 'Highlight Badge',
                        })}
                      </FormLabel>
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
                      <FormLabel>
                        {t('paymentProducts.ctaText', {
                          defaultValue: 'Button Label (CTA)',
                        })}{' '}
                        *
                      </FormLabel>
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
                      <FormLabel>
                        {t('paymentProducts.sortOrder', {
                          defaultValue: 'Display Order',
                        })}
                      </FormLabel>
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
                          <span>
                            {t('paymentProducts.popular', {
                              defaultValue: 'Highlighted / Popular',
                            })}
                          </span>
                        </div>
                        <FormDescription className='text-xs'>
                          {t('paymentProducts.popularDesc', {
                            defaultValue: 'Add accent border & badge.',
                          })}
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
                          {t('paymentProducts.activeStatus', {
                            defaultValue: 'Active Status',
                          })}
                        </FormLabel>
                        <FormDescription className='text-xs'>
                          {t('paymentProducts.activeStatusDesc', {
                            defaultValue: 'Allow purchases on the frontend.',
                          })}
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
                    <FormLabel>
                      {t('paymentProducts.features', {
                        defaultValue: 'Feature Bullet Points',
                      })}
                    </FormLabel>
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
                    <FormDescription className='text-xs'>
                      {t('paymentProducts.featuresDesc', {
                        defaultValue:
                          'Enter one feature per line. Renders as checklist bullets.',
                      })}
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
                ? t('buttons.save', {
                    defaultValue: 'Save & Sync Changes',
                  })
                : t('buttons.create', {
                    defaultValue: 'Create & Sync to Polar',
                  })}
            </Button>
          </div>
        </form>
      </Form>

      {/* Create Benefit Dialog */}
      <CreateBenefitDialog
        open={createBenefitOpen}
        onOpenChange={setCreateBenefitOpen}
        onCreated={handleBenefitCreated}
      />
    </>
  )
}
