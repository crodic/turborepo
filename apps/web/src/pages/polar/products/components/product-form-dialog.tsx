import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Loader2,
  SlidersHorizontal,
  ChevronDown,
  ImagePlus,
  Users,
  Plus,
  X,
  Sparkles,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  MetadataEditor,
  type MetadataEntry,
  metadataEntriesToObject,
  objectToMetadataEntries,
} from '../../components/metadata-editor'
import {
  useMutationCreatePolarProduct,
  useMutationUpdatePolarProduct,
  useDataPolarBenefits,
  useMutationUploadPolarMedia,
  useMutationCreateBenefit,
} from '../../queries'

export const SUPPORTED_CURRENCIES = [
  { code: 'vnd', label: 'VND', name: 'Vietnamese Dong (₫)', symbol: '₫' },
  { code: 'usd', label: 'USD', name: 'US Dollar ($)', symbol: '$' },
  { code: 'eur', label: 'EUR', name: 'Euro (€)', symbol: '€' },
  { code: 'gbp', label: 'GBP', name: 'British Pound (£)', symbol: '£' },
  { code: 'cad', label: 'CAD', name: 'Canadian Dollar (CA$)', symbol: 'CA$' },
  { code: 'aud', label: 'AUD', name: 'Australian Dollar (AU$)', symbol: 'AU$' },
  { code: 'jpy', label: 'JPY', name: 'Japanese Yen (¥)', symbol: '¥' },
  { code: 'sgd', label: 'SGD', name: 'Singapore Dollar (S$)', symbol: 'S$' },
]

const productFormSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(100),
  description: z.string().max(2000).optional(),
  visibility: z.enum(['public', 'private', 'draft']),
  isRecurring: z.boolean(),
  recurringInterval: z.enum(['month', 'year']),
  recurringIntervalCount: z.number().min(1),
  // Metered billing cycle
  hasMeter: z.boolean(),
  meterInterval: z.enum(['month', 'year']),
  meterIntervalCount: z.number().min(1),
  // Pricing model
  amountType: z.enum(['fixed', 'custom', 'free']),
  taxBehavior: z.enum(['location', 'inclusive', 'exclusive']),
  // Free trial
  hasTrial: z.boolean(),
  trialInterval: z.enum(['day', 'week', 'month', 'year']),
  trialIntervalCount: z.number().min(1),
  // Seat pricing
  hasSeatPricing: z.boolean(),
  seatChargeAmount: z.number().min(0),
  // Edit mode only
  isArchived: z.boolean(),
})

type ProductFormValues = z.infer<typeof productFormSchema>

export interface ProductMediaItem {
  id: string
  name?: string
  publicUrl?: string
  sizeReadable?: string
}

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: any | null
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
}: ProductFormDialogProps) {
  const isEditing = Boolean(product)
  const { mutate: createProduct, isPending: isCreating } =
    useMutationCreatePolarProduct()
  const { mutate: updateProduct, isPending: isUpdating } =
    useMutationUpdatePolarProduct()

  // Fetch organization benefits
  const { data: benefitsData } = useDataPolarBenefits()
  const availableBenefits = useMemo(
    () => (Array.isArray(benefitsData) ? benefitsData : []),
    [benefitsData]
  )

  // Multi-currency state
  const [activeCurrencies, setActiveCurrencies] = useState<string[]>([
    'usd',
    'vnd',
  ])
  const [pricesByCurrency, setPricesByCurrency] = useState<
    Record<string, number>
  >({
    usd: 19,
    vnd: 480000,
  })

  // Pay-what-you-want limits per currency
  const [customLimits, setCustomLimits] = useState<
    Record<string, { min: number; max?: number; preset?: number }>
  >({
    vnd: { min: 20000, max: 5000000, preset: 100000 },
    usd: { min: 5, max: 100, preset: 20 },
  })

  // Automated Benefits state
  const [selectedBenefitIds, setSelectedBenefitIds] = useState<string[]>([])

  // Quick Create Benefit state
  const [isCreateBenefitOpen, setIsCreateBenefitOpen] = useState(false)
  const [newBenefitDescription, setNewBenefitDescription] = useState('')
  const [newBenefitType, setNewBenefitType] = useState('custom')
  const createBenefitMutation = useMutationCreateBenefit()

  // Metadata entries & editing toggle
  const [metadataEntries, setMetadataEntries] = useState<MetadataEntry[]>([])
  const [isAddingMetadata, setIsAddingMetadata] = useState(false)

  // Checkout Page collapsible section
  const [isCheckoutPageOpen, setIsCheckoutPageOpen] = useState(false)

  // Product media items
  const [mediaList, setMediaList] = useState<ProductMediaItem[]>([])
  const [newMediaInput, setNewMediaInput] = useState('')
  const [isAddingMedia, setIsAddingMedia] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMediaMutation = useMutationUploadPolarMedia()

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      description: '',
      visibility: 'public',
      isRecurring: false,
      recurringInterval: 'month',
      recurringIntervalCount: 1,
      hasMeter: false,
      meterInterval: 'month',
      meterIntervalCount: 1,
      amountType: 'fixed',
      taxBehavior: 'location',
      hasTrial: false,
      trialInterval: 'day',
      trialIntervalCount: 7,
      hasSeatPricing: false,
      seatChargeAmount: 0,
      isArchived: false,
    },
  })

  // Synchronize form when dialog opens or edited product changes
  useEffect(() => {
    if (!open) return

    if (product) {
      const prices = product.prices || []
      const firstPrice = prices[0] || {}
      const isSub = Boolean(product.isRecurring ?? firstPrice.recurringInterval)
      const isCustomPrice = firstPrice.amountType === 'custom'
      const isFreePrice =
        firstPrice.amountType === 'free' || firstPrice.priceAmount === 0

      // Restore active currencies and amounts from product.prices
      if (prices.length > 0) {
        const currs: string[] = []
        const pMap: Record<string, number> = {}
        const cMap: Record<
          string,
          { min: number; max?: number; preset?: number }
        > = {}

        for (const p of prices) {
          const curr = (
            p.priceCurrency ||
            p.price_currency ||
            'usd'
          ).toLowerCase()
          if (!currs.includes(curr)) currs.push(curr)
          const isZeroDecimal =
            curr === 'vnd' || curr === 'jpy' || curr === 'krw'
          const mult = isZeroDecimal ? 1 : 100

          const amt = p.priceAmount ?? p.price_amount ?? 0
          pMap[curr] = amt / mult

          cMap[curr] = {
            min: (p.minimumAmount ?? 0) / mult,
            max: p.maximumAmount ? p.maximumAmount / mult : undefined,
            preset: p.presetAmount ? p.presetAmount / mult : undefined,
          }
        }
        setActiveCurrencies(currs.length > 0 ? currs : ['vnd'])
        setPricesByCurrency(pMap)
        setCustomLimits(cMap)
      } else {
        setActiveCurrencies(['vnd'])
      }

      // Restore benefits
      if (Array.isArray(product.benefits)) {
        setSelectedBenefitIds(
          product.benefits.map((b: any) => (typeof b === 'string' ? b : b.id))
        )
      } else {
        setSelectedBenefitIds([])
      }

      // Restore medias
      if (Array.isArray(product.medias)) {
        setMediaList(
          product.medias.map((m: any) => {
            if (typeof m === 'string') {
              const isUrl = m.startsWith('http://') || m.startsWith('https://')
              return {
                id: m,
                name: isUrl ? m.split('/').pop()?.split('?')[0] : m,
                publicUrl: isUrl
                  ? m
                  : `https://polar-public-sandbox-files.s3.amazonaws.com/${m}`,
              }
            }
            return {
              id: m.id || m.publicUrl || m.public_url || '',
              name: m.name,
              publicUrl:
                m.publicUrl ||
                m.public_url ||
                (m.path
                  ? `https://polar-public-sandbox-files.s3.amazonaws.com/${m.path}`
                  : undefined),
              sizeReadable: m.sizeReadable,
            }
          })
        )
      } else {
        setMediaList([])
      }

      const meta = objectToMetadataEntries(product.metadata)
      setMetadataEntries(meta)
      setIsAddingMetadata(meta.length > 0)

      form.reset({
        name: product.name || '',
        description: product.description || '',
        visibility: product.visibility || 'public',
        isRecurring: isSub,
        recurringInterval: firstPrice.recurringInterval || 'month',
        recurringIntervalCount: product.recurringIntervalCount || 1,
        hasMeter: Boolean(product.meterInterval),
        meterInterval: product.meterInterval || 'month',
        meterIntervalCount: product.meterIntervalCount || 1,
        amountType: isFreePrice ? 'free' : isCustomPrice ? 'custom' : 'fixed',
        taxBehavior: firstPrice.taxBehavior || 'location',
        hasTrial: Boolean(product.trialInterval),
        trialInterval: product.trialInterval || 'day',
        trialIntervalCount: product.trialIntervalCount || 7,
        hasSeatPricing: false,
        seatChargeAmount: 0,
        isArchived: Boolean(product.isArchived),
      })
    } else {
      setActiveCurrencies(['usd', 'vnd'])
      setPricesByCurrency({ usd: 19, vnd: 480000 })
      setCustomLimits({
        vnd: { min: 20000, max: 5000000, preset: 100000 },
        usd: { min: 5, max: 100, preset: 20 },
      })
      setSelectedBenefitIds([])
      setMediaList([])
      setMetadataEntries([])
      setIsAddingMetadata(false)
      setIsCheckoutPageOpen(false)
      form.reset({
        name: '',
        description: '',
        visibility: 'public',
        isRecurring: false,
        recurringInterval: 'month',
        recurringIntervalCount: 1,
        hasMeter: false,
        meterInterval: 'month',
        meterIntervalCount: 1,
        amountType: 'fixed',
        taxBehavior: 'location',
        hasTrial: false,
        trialInterval: 'day',
        trialIntervalCount: 7,
        hasSeatPricing: false,
        seatChargeAmount: 0,
        isArchived: false,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]) // Safe dependency array preventing infinite render loops

  // Currency handlers
  const handleAddCurrency = (currCode: string) => {
    if (!activeCurrencies.includes(currCode)) {
      setActiveCurrencies([...activeCurrencies, currCode])
      if (pricesByCurrency[currCode] === undefined) {
        setPricesByCurrency((prev) => ({
          ...prev,
          [currCode]: currCode === 'vnd' ? 0 : 19,
        }))
      }
    }
  }

  const handleRemoveCurrency = (currCode: string) => {
    if (activeCurrencies.length <= 1) return
    setActiveCurrencies(activeCurrencies.filter((c) => c !== currCode))
  }

  const handlePriceChange = (currCode: string, value: number) => {
    setPricesByCurrency((prev) => ({
      ...prev,
      [currCode]: value,
    }))
  }

  const handleCustomLimitChange = (
    currCode: string,
    field: 'min' | 'max' | 'preset',
    value: number
  ) => {
    setCustomLimits((prev) => ({
      ...prev,
      [currCode]: {
        ...prev[currCode],
        [field]: value,
      },
    }))
  }

  // Toggle benefit selection (memoized to avoid triggering re-renders)
  const handleToggleBenefit = useCallback((benefitId: string) => {
    setSelectedBenefitIds((prev) =>
      prev.includes(benefitId)
        ? prev.filter((id) => id !== benefitId)
        : [...prev, benefitId]
    )
  }, [])

  // Create benefit handler
  const handleCreateBenefit = async () => {
    if (!newBenefitDescription.trim()) {
      toast.error('Benefit description is required')
      return
    }
    try {
      const res = await createBenefitMutation.mutateAsync({
        type: newBenefitType,
        description: newBenefitDescription.trim(),
      })
      if (res?.id) {
        setSelectedBenefitIds((prev) => [...prev, res.id])
        setNewBenefitDescription('')
        setIsCreateBenefitOpen(false)
        toast.success('Benefit created and attached')
      }
    } catch {
      // Error handled by mutation onError
    }
  }

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ]
    if (!allowedTypes.includes(file.type)) {
      toast.error(
        'Only images (JPEG, PNG, GIF, WebP, SVG) are allowed for product media.'
      )
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds the 10 MB limit.')
      return
    }

    try {
      const res = await uploadMediaMutation.mutateAsync(file)
      if (res?.id) {
        const localPreview = URL.createObjectURL(file)
        const newItem: ProductMediaItem = {
          id: res.id,
          name: res.name || file.name,
          publicUrl: res.publicUrl || localPreview,
          sizeReadable:
            res.sizeReadable || `${(file.size / 1024).toFixed(1)} KB`,
        }
        setMediaList((prev) => [...prev, newItem])
        toast.success(`Image "${file.name}" uploaded to Polar`)
      }
    } catch {
      // Error handled by mutation onError
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleAddMedia = () => {
    const trimmed = newMediaInput.trim()
    if (!trimmed) return
    const isUrl =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
    const newItem: ProductMediaItem = {
      id: trimmed,
      name: isUrl ? trimmed.split('/').pop()?.split('?')[0] : trimmed,
      publicUrl: isUrl
        ? trimmed
        : `https://polar-public-sandbox-files.s3.amazonaws.com/${trimmed}`,
    }
    setMediaList((prev) => [...prev, newItem])
    setNewMediaInput('')
    setIsAddingMedia(false)
  }

  const handleRemoveMedia = (index: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = (values: ProductFormValues) => {
    // Generate pricing objects for all active currencies
    const pricesPayload: any[] = activeCurrencies.map((curr) => {
      const isZeroDecimal = curr === 'vnd' || curr === 'jpy' || curr === 'krw'
      const mult = isZeroDecimal ? 1 : 100

      if (values.amountType === 'custom') {
        const lim = customLimits[curr] || { min: 5, max: 100, preset: 20 }
        return {
          amountType: 'custom',
          priceCurrency: curr,
          minimumAmount: Math.round(lim.min * mult),
          maximumAmount: lim.max ? Math.round(lim.max * mult) : undefined,
          presetAmount: lim.preset ? Math.round(lim.preset * mult) : undefined,
        }
      }

      if (values.amountType === 'free') {
        return {
          amountType: 'free',
          priceCurrency: curr,
        }
      }

      const rawAmount = pricesByCurrency[curr] ?? 0
      return {
        amountType: 'fixed',
        priceCurrency: curr,
        priceAmount: Math.round(rawAmount * mult),
      }
    })

    const metadataObj = metadataEntriesToObject(metadataEntries)

    if (isEditing) {
      updateProduct(
        {
          id: product.id,
          payload: {
            name: values.name,
            description: values.description || undefined,
            visibility: values.visibility,
            taxBehavior: values.taxBehavior,
            prices: pricesPayload,
            medias:
              mediaList.length > 0 ? mediaList.map((m) => m.id) : undefined,
            metadata: metadataObj,
            isArchived: values.isArchived,
            benefits: selectedBenefitIds,
          },
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      )
    } else {
      createProduct(
        {
          name: values.name,
          description: values.description || undefined,
          visibility: values.visibility,
          isRecurring: values.isRecurring,
          recurringInterval: values.isRecurring
            ? values.recurringInterval
            : undefined,
          recurringIntervalCount: values.isRecurring
            ? values.recurringIntervalCount
            : undefined,
          meterInterval: values.hasMeter ? values.meterInterval : undefined,
          meterIntervalCount: values.hasMeter
            ? values.meterIntervalCount
            : undefined,
          trialInterval: values.hasTrial ? values.trialInterval : undefined,
          trialIntervalCount: values.hasTrial
            ? values.trialIntervalCount
            : undefined,
          taxBehavior: values.taxBehavior,
          prices: pricesPayload,
          medias: mediaList.length > 0 ? mediaList.map((m) => m.id) : undefined,
          metadata: metadataObj,
          benefits: selectedBenefitIds,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      )
    }
  }

  const isPending = isCreating || isUpdating
  const isRecurring = form.watch('isRecurring')
  const visibility = form.watch('visibility')
  const amountType = form.watch('amountType')
  const hasTrial = form.watch('hasTrial')
  const hasMeter = form.watch('hasMeter')
  const hasSeatPricing = form.watch('hasSeatPricing')

  const unusedCurrencies = SUPPORTED_CURRENCIES.filter(
    (c) => !activeCurrencies.includes(c.code)
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-h-[92vh] overflow-y-auto sm:max-w-2xl'>
          <DialogHeader className='flex flex-row items-center justify-between border-b pb-4'>
            <div>
              <DialogTitle className='text-foreground text-lg font-bold tracking-tight'>
                {isEditing ? 'Edit Product' : 'Create Product'}
              </DialogTitle>
              <DialogDescription className='text-muted-foreground mt-0.5 text-xs'>
                {isEditing
                  ? `Configure pricing, automated benefits, and checkout appearance for ${product?.name}`
                  : 'Basic product information, pricing models, benefits, and checkout appearance'}
              </DialogDescription>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-6 pt-2'
            >
              {/* SECTION 1: Product */}
              <div className='space-y-4'>
                <div>
                  <h3 className='text-foreground text-sm font-semibold tracking-tight'>
                    Product
                  </h3>
                  <p className='text-muted-foreground mt-0.5 text-xs'>
                    Basic product information
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-medium'>
                        Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g. Pro Plan, Lifetime License'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='border-border/30 border-t' />

              {/* SECTION 2: Pricing */}
              <div className='space-y-4'>
                <div>
                  <h3 className='text-foreground text-sm font-semibold tracking-tight'>
                    Pricing
                  </h3>
                  <p className='text-muted-foreground mt-0.5 text-xs'>
                    Set your billing cycle and pricing model
                  </p>
                </div>

                {/* One-time vs Recurring Card Selection */}
                <div className='grid grid-cols-2 gap-3'>
                  <div
                    onClick={() => {
                      if (!isEditing) form.setValue('isRecurring', false)
                    }}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 transition-all',
                      !isRecurring
                        ? 'border-primary/80 bg-primary/5'
                        : 'border-border/60 hover:bg-muted/20 opacity-80',
                      isEditing && 'cursor-not-allowed opacity-60'
                    )}
                  >
                    <div
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-full border',
                        !isRecurring
                          ? 'border-primary'
                          : 'border-muted-foreground/40'
                      )}
                    >
                      {!isRecurring && (
                        <div className='bg-primary size-2 rounded-full' />
                      )}
                    </div>
                    <span className='text-foreground text-xs font-semibold'>
                      One-time purchase
                    </span>
                  </div>

                  <div
                    onClick={() => {
                      if (!isEditing) form.setValue('isRecurring', true)
                    }}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 transition-all',
                      isRecurring
                        ? 'border-primary/80 bg-primary/5'
                        : 'border-border/60 hover:bg-muted/20 opacity-80',
                      isEditing && 'cursor-not-allowed opacity-60'
                    )}
                  >
                    <div
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-full border',
                        isRecurring
                          ? 'border-primary'
                          : 'border-muted-foreground/40'
                      )}
                    >
                      {isRecurring && (
                        <div className='bg-primary size-2 rounded-full' />
                      )}
                    </div>
                    <span className='text-foreground text-xs font-semibold'>
                      Recurring subscription
                    </span>
                  </div>
                </div>

                {/* Cadence options if Recurring */}
                {isRecurring && (
                  <div className='border-border/40 bg-muted/10 grid grid-cols-2 gap-3 rounded-lg border p-3'>
                    <FormField
                      control={form.control}
                      name='recurringInterval'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-xs'>
                            Billing Interval
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                            disabled={isEditing}
                          >
                            <FormControl>
                              <SelectTrigger className='w-full'>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value='month'>Monthly</SelectItem>
                              <SelectItem value='year'>Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='taxBehavior'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-xs'>
                            Tax Behavior
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className='w-full'>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value='location'>
                                Default (Location)
                              </SelectItem>
                              <SelectItem value='inclusive'>
                                Tax Inclusive (Gross)
                              </SelectItem>
                              <SelectItem value='exclusive'>
                                Tax Exclusive (Net)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Currencies Bar */}
                <div className='space-y-2 pt-2'>
                  <div className='flex items-center justify-between'>
                    <span className='text-foreground text-xs font-semibold'>
                      Currencies
                    </span>
                    {unusedCurrencies.length > 0 && (
                      <Select onValueChange={handleAddCurrency} value=''>
                        <SelectTrigger size='sm' className='w-auto'>
                          <SelectValue placeholder='Add Currency' />
                        </SelectTrigger>
                        <SelectContent align='end'>
                          {unusedCurrencies.map((c) => (
                            <SelectItem
                              key={c.code}
                              value={c.code}
                              className='text-xs'
                            >
                              {c.label} - {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    {activeCurrencies.map((curr) => {
                      const info = SUPPORTED_CURRENCIES.find(
                        (c) => c.code === curr
                      )
                      return (
                        <Badge
                          key={curr}
                          variant='secondary'
                          className='bg-background border-border/60 flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-semibold tracking-wider uppercase'
                        >
                          {info?.label || curr.toUpperCase()}
                          {activeCurrencies.length > 1 && (
                            <button
                              type='button'
                              onClick={() => handleRemoveCurrency(curr)}
                              className='hover:text-destructive text-muted-foreground ml-0.5'
                            >
                              <X className='size-3' />
                            </button>
                          )}
                        </Badge>
                      )
                    })}
                  </div>
                </div>

                {/* Price Configuration Header & Action buttons */}
                <div className='space-y-3 pt-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-foreground text-xs font-semibold'>
                      Price Configuration
                    </span>
                    <div className='flex items-center gap-2'>
                      <Button
                        type='button'
                        variant={hasSeatPricing ? 'secondary' : 'outline'}
                        size='sm'
                        onClick={() =>
                          form.setValue('hasSeatPricing', !hasSeatPricing)
                        }
                      >
                        <Users />
                        {hasSeatPricing
                          ? 'Remove seat pricing'
                          : 'Add seat pricing'}
                      </Button>

                      {!isEditing && (
                        <Button
                          type='button'
                          variant={hasMeter ? 'secondary' : 'outline'}
                          size='sm'
                          onClick={() => form.setValue('hasMeter', !hasMeter)}
                        >
                          <SlidersHorizontal />
                          {hasMeter
                            ? 'Remove unit pricing'
                            : 'Add unit pricing'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Price Type Select */}
                  <FormField
                    control={form.control}
                    name='amountType'
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className='w-full'>
                              <SelectValue placeholder='Select price model' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='fixed' className='text-xs'>
                              Fixed price
                            </SelectItem>
                            <SelectItem value='custom' className='text-xs'>
                              Pay what you want (Custom price)
                            </SelectItem>
                            <SelectItem value='free' className='text-xs'>
                              Free price
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Price inputs for each active currency */}
                  {amountType === 'fixed' && (
                    <div className='space-y-2'>
                      {activeCurrencies.map((curr) => {
                        const info = SUPPORTED_CURRENCIES.find(
                          (c) => c.code === curr
                        )
                        const val = pricesByCurrency[curr] ?? 0
                        return (
                          <div key={curr} className='flex items-center gap-3'>
                            <span className='text-muted-foreground w-12 shrink-0 text-sm font-semibold uppercase'>
                              {info?.label || curr.toUpperCase()}
                            </span>
                            <div className='relative flex-1'>
                              <Input
                                type='number'
                                min={0}
                                step={curr === 'vnd' ? '1000' : '0.01'}
                                value={val}
                                onChange={(e) =>
                                  handlePriceChange(
                                    curr,
                                    e.target.value === ''
                                      ? 0
                                      : Number(e.target.value)
                                  )
                                }
                                placeholder='0'
                              />
                            </div>
                            <span className='text-muted-foreground w-6 shrink-0 text-right font-mono text-sm'>
                              {info?.symbol}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Custom pay-what-you-want limits */}
                  {amountType === 'custom' && (
                    <div className='border-border/60 bg-muted/10 space-y-2.5 rounded-md border p-3'>
                      <p className='text-muted-foreground text-xs'>
                        Allow your customers to name their price with minimum,
                        maximum, and suggested presets.
                      </p>
                      {activeCurrencies.map((curr) => {
                        const info = SUPPORTED_CURRENCIES.find(
                          (c) => c.code === curr
                        )
                        const lim = customLimits[curr] || { min: 0 }
                        return (
                          <div
                            key={curr}
                            className='border-border/20 grid grid-cols-3 gap-2 border-t pt-1 first:border-0'
                          >
                            <div>
                              <span className='text-muted-foreground mb-1 block text-[10px] font-semibold uppercase'>
                                Min ({info?.label})
                              </span>
                              <Input
                                type='number'
                                min={0}
                                value={lim.min}
                                onChange={(e) =>
                                  handleCustomLimitChange(
                                    curr,
                                    'min',
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </div>
                            <div>
                              <span className='text-muted-foreground mb-1 block text-[10px] font-semibold uppercase'>
                                Preset ({info?.label})
                              </span>
                              <Input
                                type='number'
                                min={0}
                                value={lim.preset ?? ''}
                                placeholder='Optional'
                                onChange={(e) =>
                                  handleCustomLimitChange(
                                    curr,
                                    'preset',
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </div>
                            <div>
                              <span className='text-muted-foreground mb-1 block text-[10px] font-semibold uppercase'>
                                Max ({info?.label})
                              </span>
                              <Input
                                type='number'
                                min={0}
                                value={lim.max ?? ''}
                                placeholder='Unlimited'
                                onChange={(e) =>
                                  handleCustomLimitChange(
                                    curr,
                                    'max',
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Seat pricing settings */}
                  {hasSeatPricing && (
                    <div className='border-border/60 bg-muted/10 space-y-2 rounded-md border p-3'>
                      <FormLabel className='text-xs font-semibold'>
                        Seat Price
                      </FormLabel>
                      <FormField
                        control={form.control}
                        name='seatChargeAmount'
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type='number'
                                min={0}
                                placeholder='Charge per seat'
                                {...field}
                                onChange={(e) =>
                                  field.onChange(Number(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormDescription className='text-[11px]'>
                              Additional amount charged per assigned team member
                              seat.
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Metered usage settings */}
                  {hasMeter && !isEditing && (
                    <div className='border-border/60 bg-muted/10 grid grid-cols-2 gap-3 rounded-md border p-3'>
                      <FormField
                        control={form.control}
                        name='meterInterval'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-xs'>
                              Meter Reset Cadence
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className='w-full'>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value='month'>
                                  Monthly Reset
                                </SelectItem>
                                <SelectItem value='year'>
                                  Yearly Reset
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='meterIntervalCount'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-xs'>
                              Interval Count
                            </FormLabel>
                            <FormControl>
                              <Input
                                type='number'
                                min={1}
                                {...field}
                                onChange={(e) =>
                                  field.onChange(Number(e.target.value))
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Free trial toggle if subscription */}
                  {isRecurring && !isEditing && (
                    <div className='space-y-2 pt-2'>
                      <FormField
                        control={form.control}
                        name='hasTrial'
                        render={({ field }) => (
                          <FormItem className='border-border/60 bg-muted/10 flex items-center justify-between rounded-md border p-3'>
                            <div>
                              <FormLabel className='text-xs font-semibold'>
                                Offer Free Trial
                              </FormLabel>
                              <FormDescription className='text-[11px]'>
                                Grant access for a trial period before recurring
                                billing starts.
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
                      {hasTrial && (
                        <div className='border-border/60 bg-muted/10 grid grid-cols-2 gap-3 rounded-md border p-3'>
                          <FormField
                            control={form.control}
                            name='trialInterval'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='text-xs'>
                                  Trial Interval
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className='w-full'>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value='day'>Days</SelectItem>
                                    <SelectItem value='month'>
                                      Months
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name='trialIntervalCount'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='text-xs'>Count</FormLabel>
                                <FormControl>
                                  <Input
                                    type='number'
                                    min={1}
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(Number(e.target.value))
                                    }
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className='border-border/30 border-t' />

              {/* SECTION 3: Automated Benefits */}
              <div className='space-y-3'>
                <div>
                  <h3 className='text-foreground text-sm font-semibold tracking-tight'>
                    Automated Benefits
                  </h3>
                  <p className='text-muted-foreground mt-0.5 text-xs'>
                    Configure which benefits you want to grant to your customers
                    when they purchase the product
                  </p>
                </div>

                <div className='border-border/60 divide-border/40 bg-card/20 divide-y overflow-hidden rounded-lg border'>
                  {availableBenefits.length === 0 ? (
                    <div className='text-muted-foreground p-6 text-center text-xs'>
                      No benefits created yet on Polar.
                    </div>
                  ) : (
                    availableBenefits.map((b: any) => {
                      const isSelected = selectedBenefitIds.includes(b.id)
                      return (
                        <div
                          key={b.id}
                          className='hover:bg-muted/15 flex items-center justify-between p-3.5 transition-colors'
                        >
                          <div className='flex min-w-0 items-center gap-3'>
                            <div className='border-border/60 bg-muted/30 flex size-8 shrink-0 items-center justify-center rounded-md border'>
                              <Sparkles className='text-primary size-4' />
                            </div>
                            <div className='min-w-0'>
                              <p className='text-foreground truncate text-xs font-semibold'>
                                {b.description || b.name || 'Benefit'}
                              </p>
                              <p className='text-muted-foreground text-[11px] capitalize'>
                                {b.type ? b.type.replace('_', ' ') : 'Custom'}
                              </p>
                            </div>
                          </div>

                          <div className='flex items-center gap-3'>
                            <Switch
                              checked={isSelected}
                              onCheckedChange={() => handleToggleBenefit(b.id)}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => setIsCreateBenefitOpen(true)}
                  >
                    <Plus />
                    Create Benefit
                  </Button>
                </div>
              </div>

              <div className='border-border/30 border-t' />

              {/* SECTION 4: Metadata */}
              <div className='space-y-3'>
                <div>
                  <h3 className='text-foreground text-sm font-semibold tracking-tight'>
                    Metadata
                  </h3>
                  <p className='text-muted-foreground mt-0.5 text-xs'>
                    Optional metadata to associate with the product
                  </p>
                </div>

                {metadataEntries.length === 0 && !isAddingMetadata ? (
                  <div className='border-border/60 bg-card/20 flex flex-col items-center justify-center gap-3 rounded-lg border p-5'>
                    <span className='text-muted-foreground text-xs'>
                      No metadata added
                    </span>
                    <div className='flex w-full justify-end'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setIsAddingMetadata(true)
                          setMetadataEntries([{ key: '', value: '' }])
                        }}
                      >
                        <Plus />
                        Add Metadata
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className='border-border/60 bg-card/20 space-y-3 rounded-lg border p-3'>
                    <MetadataEditor
                      entries={metadataEntries}
                      onChange={setMetadataEntries}
                    />
                    {metadataEntries.length === 0 && (
                      <div className='flex justify-end'>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={() => setIsAddingMetadata(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className='border-border/30 border-t' />

              {/* SECTION 5: Customer Portal */}
              <div className='space-y-3'>
                <div>
                  <h3 className='text-foreground text-sm font-semibold tracking-tight'>
                    Customer Portal
                  </h3>
                  <p className='text-muted-foreground mt-0.5 text-xs'>
                    Customize how this product is presented in the customer
                    portal
                  </p>
                </div>

                <div className='space-y-2'>
                  <span className='text-foreground text-xs font-semibold'>
                    Visibility
                  </span>
                  <div className='grid grid-cols-2 gap-3'>
                    <div
                      onClick={() => form.setValue('visibility', 'public')}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-all',
                        visibility === 'public'
                          ? 'border-primary/80 bg-primary/5'
                          : 'border-border/60 hover:bg-muted/20 opacity-80'
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                          visibility === 'public'
                            ? 'border-primary'
                            : 'border-muted-foreground/40'
                        )}
                      >
                        {visibility === 'public' && (
                          <div className='bg-primary size-2 rounded-full' />
                        )}
                      </div>
                      <div>
                        <div className='text-foreground text-xs font-semibold'>
                          Public
                        </div>
                        <div className='text-muted-foreground mt-0.5 text-[11px]'>
                          Shown in the Customer Portal
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => form.setValue('visibility', 'private')}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-all',
                        visibility === 'private'
                          ? 'border-primary/80 bg-primary/5'
                          : 'border-border/60 hover:bg-muted/20 opacity-80'
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                          visibility === 'private'
                            ? 'border-primary'
                            : 'border-muted-foreground/40'
                        )}
                      >
                        {visibility === 'private' && (
                          <div className='bg-primary size-2 rounded-full' />
                        )}
                      </div>
                      <div>
                        <div className='text-foreground text-xs font-semibold'>
                          Private
                        </div>
                        <div className='text-muted-foreground mt-0.5 text-[11px]'>
                          Only purchasable via a direct checkout link
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className='border-border/30 border-t' />

              {/* SECTION 6: Checkout Page (Accordion) */}
              <div className='border-border/60 bg-card/20 overflow-hidden rounded-lg border'>
                <button
                  type='button'
                  onClick={() => setIsCheckoutPageOpen((prev) => !prev)}
                  className='hover:bg-muted/10 flex w-full items-center justify-between p-4 text-left transition-colors'
                >
                  <div>
                    <h3 className='text-foreground text-sm font-semibold tracking-tight'>
                      Checkout Page
                    </h3>
                    <p className='text-muted-foreground mt-0.5 text-xs'>
                      Customize how this product is presented during checkout
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      'text-muted-foreground size-4 transition-transform duration-200',
                      isCheckoutPageOpen && 'rotate-180'
                    )}
                  />
                </button>

                {isCheckoutPageOpen && (
                  <div className='border-border/30 space-y-4 border-t p-4 pt-2'>
                    {/* Description */}
                    <FormField
                      control={form.control}
                      name='description'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-xs font-medium'>
                            Description
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder='Describe your product... Markdown is supported.'
                              rows={4}
                              className='resize-y font-mono'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Product Images / Media */}
                    <div className='space-y-2'>
                      <FormLabel className='block text-xs font-medium'>
                        Product images
                      </FormLabel>

                      <input
                        ref={fileInputRef}
                        type='file'
                        accept='image/*'
                        className='hidden'
                        onChange={handleFileUpload}
                      />

                      <div
                        onClick={() => {
                          if (!uploadMediaMutation.isPending) {
                            fileInputRef.current?.click()
                          }
                        }}
                        className='hover:bg-muted/10 border-border/60 relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 text-center transition-colors'
                      >
                        {uploadMediaMutation.isPending ? (
                          <div className='flex flex-col items-center gap-2 py-2'>
                            <Loader2 className='text-primary size-6 animate-spin' />
                            <p className='text-foreground text-xs font-medium'>
                              Uploading image to Polar...
                            </p>
                          </div>
                        ) : (
                          <>
                            <ImagePlus className='text-muted-foreground/70 mb-2 size-6' />
                            <p className='text-foreground text-xs font-semibold'>
                              Upload product image
                            </p>
                            <p className='text-muted-foreground mt-0.5 text-[11px]'>
                              Click to select image or drag & drop. Up to 10MB
                              each.
                            </p>
                          </>
                        )}
                      </div>

                      <div className='flex justify-end'>
                        <Button
                          type='button'
                          variant='link'
                          size='sm'
                          className='text-muted-foreground p-0'
                          onClick={() => setIsAddingMedia((prev) => !prev)}
                        >
                          {isAddingMedia
                            ? 'Hide manual input'
                            : 'Or paste file ID / URL manually'}
                        </Button>
                      </div>

                      {isAddingMedia && (
                        <div className='border-border/60 bg-muted/20 flex items-center gap-2 rounded-md border p-2'>
                          <Input
                            placeholder='Paste Polar file ID (file_...) or image URL'
                            value={newMediaInput}
                            onChange={(e) => setNewMediaInput(e.target.value)}
                          />
                          <Button
                            type='button'
                            size='sm'
                            onClick={handleAddMedia}
                          >
                            Attach
                          </Button>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => {
                              setIsAddingMedia(false)
                              setNewMediaInput('')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}

                      {/* Attached Media List */}
                      {mediaList.length > 0 && (
                        <div className='space-y-2 pt-1'>
                          <div className='flex items-center justify-between'>
                            <span className='text-muted-foreground text-xs font-medium'>
                              Attached images ({mediaList.length})
                            </span>
                            {mediaList.length > 1 && (
                              <span className='text-muted-foreground text-[11px]'>
                                First image is used as cover
                              </span>
                            )}
                          </div>

                          <div className='space-y-2'>
                            {mediaList.map((media, idx) => (
                              <div
                                key={`${media.id}-${idx}`}
                                className='border-border/60 bg-muted/10 hover:bg-muted/20 flex items-center justify-between gap-3 rounded-lg border p-2.5 transition-colors'
                              >
                                <div className='flex min-w-0 flex-1 items-center gap-3'>
                                  {/* Thumbnail Preview */}
                                  <div className='border-border/60 bg-muted/30 relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border'>
                                    {media.publicUrl ? (
                                      <img
                                        src={media.publicUrl}
                                        alt={media.name || 'Product media'}
                                        className='h-full w-full object-cover'
                                        onError={(e) => {
                                          ;(
                                            e.currentTarget as HTMLElement
                                          ).style.display = 'none'
                                          const fallback = e.currentTarget
                                            .nextElementSibling as HTMLElement
                                          if (fallback)
                                            fallback.style.display = 'flex'
                                        }}
                                      />
                                    ) : null}
                                    <div
                                      className='bg-muted/40 text-muted-foreground hidden h-full w-full items-center justify-center'
                                      style={{
                                        display: media.publicUrl
                                          ? 'none'
                                          : 'flex',
                                      }}
                                    >
                                      <ImageIcon className='size-5' />
                                    </div>
                                  </div>

                                  {/* Media Information */}
                                  <div className='min-w-0 flex-1 space-y-0.5'>
                                    <div className='flex items-center gap-1.5'>
                                      <p className='text-foreground truncate text-xs font-semibold'>
                                        {media.name || 'Product image'}
                                      </p>
                                      {idx === 0 && (
                                        <Badge
                                          variant='outline'
                                          className='h-4 px-1.5 py-0 text-[10px]'
                                        >
                                          Cover
                                        </Badge>
                                      )}
                                    </div>
                                    <p className='text-muted-foreground truncate font-mono text-[11px]'>
                                      {media.sizeReadable
                                        ? `${media.sizeReadable} • `
                                        : ''}
                                      {media.id}
                                    </p>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className='flex shrink-0 items-center gap-1'>
                                  {media.publicUrl && (
                                    <Button
                                      type='button'
                                      variant='ghost'
                                      size='icon-sm'
                                      className='text-muted-foreground hover:text-foreground'
                                      title='Open full image'
                                      asChild
                                    >
                                      <a
                                        href={media.publicUrl}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                      >
                                        <ExternalLink className='size-4' />
                                      </a>
                                    </Button>
                                  )}
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon-sm'
                                    className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                    title='Remove image'
                                    onClick={() => handleRemoveMedia(idx)}
                                  >
                                    <Trash2 className='size-4' />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Archive Toggle if Editing */}
              {isEditing && (
                <div className='flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-3'>
                  <div>
                    <span className='block text-xs font-semibold text-amber-500'>
                      Archive Product
                    </span>
                    <span className='text-muted-foreground text-[11px]'>
                      Archived products are hidden from the store catalog
                    </span>
                  </div>
                  <Switch
                    checked={form.watch('isArchived')}
                    onCheckedChange={(checked) =>
                      form.setValue('isArchived', checked)
                    }
                  />
                </div>
              )}

              {/* Footer */}
              <DialogFooter className='border-border/40 gap-3 border-t pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type='submit' disabled={isPending}>
                  {isPending && (
                    <Loader2 className='mr-2 size-4 animate-spin' />
                  )}
                  {isEditing ? 'Save Changes' : 'Create Product'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Quick Create Benefit Dialog */}
      <Dialog open={isCreateBenefitOpen} onOpenChange={setIsCreateBenefitOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold'>
              Create New Benefit
            </DialogTitle>
            <DialogDescription className='text-muted-foreground text-xs'>
              Add a benefit to automatically grant customers upon product
              purchase.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2'>
            <div className='space-y-1.5'>
              <FormLabel className='text-xs font-medium'>
                Description / Name
              </FormLabel>
              <Input
                placeholder='e.g. VIP Discord Channel, 500 Credits'
                value={newBenefitDescription}
                onChange={(e) => setNewBenefitDescription(e.target.value)}
              />
            </div>

            <div className='space-y-1.5'>
              <FormLabel className='text-xs font-medium'>
                Benefit Type
              </FormLabel>
              <Select value={newBenefitType} onValueChange={setNewBenefitType}>
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='custom'>Custom entitlement</SelectItem>
                  <SelectItem value='license_keys'>License Key</SelectItem>
                  <SelectItem value='downloadables'>
                    Downloadable file
                  </SelectItem>
                  <SelectItem value='discord'>Discord role</SelectItem>
                  <SelectItem value='github_repository'>
                    GitHub repository access
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className='gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsCreateBenefitOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={handleCreateBenefit}
              disabled={createBenefitMutation.isPending}
            >
              {createBenefitMutation.isPending && (
                <Loader2 className='mr-2 size-4 animate-spin' />
              )}
              Create & Attach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
