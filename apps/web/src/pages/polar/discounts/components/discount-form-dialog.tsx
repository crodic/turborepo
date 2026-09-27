import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Tag, Percent, Clock, Loader2, Package, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  MetadataEditor,
  type MetadataEntry,
  metadataEntriesToObject,
  objectToMetadataEntries,
} from '../../components/metadata-editor'
import {
  useMutationCreatePolarDiscount,
  useMutationUpdatePolarDiscount,
  useDataPolarProducts,
} from '../../queries'

const discountFormSchema = z.object({
  name: z.string().min(1, 'Discount name is required').max(100),
  code: z
    .string()
    .max(50)
    .regex(/^[A-Za-z0-9_-]*$/, 'Code must be alphanumeric')
    .optional(),
  type: z.enum(['percentage', 'fixed']),
  percentage: z.number().min(0.01).max(100),
  fixedAmountDollars: z.number().min(0.5),
  currency: z.string(),
  duration: z.enum(['once', 'forever', 'repeating']),
  durationInMonths: z.number().min(1),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  maxRedemptionsInput: z.string().optional(),
  applyToAllProducts: z.boolean(),
  selectedProductIds: z.array(z.string()),
})

type DiscountFormValues = z.infer<typeof discountFormSchema>

interface DiscountFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  discount?: any | null
}

export function DiscountFormDialog({
  open,
  onOpenChange,
  discount,
}: DiscountFormDialogProps) {
  const isEditing = Boolean(discount)
  const { mutate: createDiscount, isPending: isCreating } =
    useMutationCreatePolarDiscount()
  const { mutate: updateDiscount, isPending: isUpdating } =
    useMutationUpdatePolarDiscount()

  // Fetch active products for product selector
  const { data: productsData } = useDataPolarProducts({ limit: 100 })
  const products = productsData?.data || []

  const [metadataEntries, setMetadataEntries] = useState<MetadataEntry[]>([])

  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: {
      name: '',
      code: '',
      type: 'percentage',
      percentage: 20,
      fixedAmountDollars: 10,
      currency: 'usd',
      duration: 'once',
      durationInMonths: 3,
      startsAt: '',
      endsAt: '',
      maxRedemptionsInput: '',
      applyToAllProducts: true,
      selectedProductIds: [],
    },
  })

  useEffect(() => {
    if (discount && open) {
      const isPct = discount.type === 'percentage'
      const basisPoints = discount.basisPoints ?? discount.basis_points ?? 0
      const amountCents = discount.amount ?? 0
      const hasProducts = Boolean(
        discount.products && discount.products.length > 0
      )

      setMetadataEntries(objectToMetadataEntries(discount.metadata))

      form.reset({
        name: discount.name || '',
        code: discount.code || '',
        type: isPct ? 'percentage' : 'fixed',
        percentage: basisPoints ? basisPoints / 100 : 20,
        fixedAmountDollars: amountCents ? amountCents / 100 : 10,
        currency: discount.currency || 'usd',
        duration: discount.duration || 'once',
        durationInMonths:
          discount.durationInMonths ?? discount.duration_in_months ?? 3,
        startsAt: discount.startsAt ? discount.startsAt.slice(0, 10) : '',
        endsAt: discount.endsAt ? discount.endsAt.slice(0, 10) : '',
        maxRedemptionsInput:
          (discount.maxRedemptions ?? discount.max_redemptions)
            ? String(discount.maxRedemptions ?? discount.max_redemptions)
            : '',
        applyToAllProducts: !hasProducts,
        selectedProductIds: hasProducts
          ? discount.products.map((p: any) =>
              typeof p === 'string' ? p : p.id
            )
          : [],
      })
    } else if (!discount && open) {
      setMetadataEntries([])
      form.reset({
        name: '',
        code: '',
        type: 'percentage',
        percentage: 20,
        fixedAmountDollars: 10,
        currency: 'usd',
        duration: 'once',
        durationInMonths: 3,
        startsAt: '',
        endsAt: '',
        maxRedemptionsInput: '',
        applyToAllProducts: true,
        selectedProductIds: [],
      })
    }
  }, [discount, open, form])

  const onSubmit = (values: DiscountFormValues) => {
    const basisPoints = Math.round(values.percentage * 100)
    const amountCents = Math.round(values.fixedAmountDollars * 100)
    const productsList =
      values.applyToAllProducts || values.selectedProductIds.length === 0
        ? undefined
        : values.selectedProductIds

    const maxRedemptions =
      values.maxRedemptionsInput && values.maxRedemptionsInput.trim() !== ''
        ? Number(values.maxRedemptionsInput)
        : undefined

    const metadataObj = metadataEntriesToObject(metadataEntries)

    if (isEditing && discount) {
      updateDiscount(
        {
          id: discount.id,
          payload: {
            name: values.name,
            code: values.code ? values.code.toUpperCase() : undefined,
            type: values.type,
            basisPoints: values.type === 'percentage' ? basisPoints : undefined,
            amount: values.type === 'fixed' ? amountCents : undefined,
            currency: values.currency,
            duration: values.duration,
            durationInMonths:
              values.duration === 'repeating'
                ? values.durationInMonths
                : undefined,
            startsAt: values.startsAt
              ? new Date(values.startsAt).toISOString()
              : undefined,
            endsAt: values.endsAt
              ? new Date(values.endsAt).toISOString()
              : undefined,
            maxRedemptions,
            products: productsList,
            metadata: metadataObj,
          },
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      )
    } else {
      createDiscount(
        {
          name: values.name,
          code: values.code ? values.code.toUpperCase() : undefined,
          type: values.type,
          basisPoints: values.type === 'percentage' ? basisPoints : undefined,
          amount: values.type === 'fixed' ? amountCents : undefined,
          currency: values.currency,
          duration: values.duration,
          durationInMonths:
            values.duration === 'repeating'
              ? values.durationInMonths
              : undefined,
          startsAt: values.startsAt
            ? new Date(values.startsAt).toISOString()
            : undefined,
          endsAt: values.endsAt
            ? new Date(values.endsAt).toISOString()
            : undefined,
          maxRedemptions,
          products: productsList,
          metadata: metadataObj,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      )
    }
  }

  const isPending = isCreating || isUpdating
  const discountType = form.watch('type')
  const duration = form.watch('duration')
  const applyToAllProducts = form.watch('applyToAllProducts')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[92vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <div className='text-primary flex items-center gap-2'>
            <Tag className='h-5 w-5' />
            <DialogTitle>
              {isEditing ? 'Edit Discount' : 'Create Discount Coupon'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isEditing
              ? `Update discount configuration for ${discount?.name} on Polar`
              : 'Create promotional coupons, percentage discounts, or fixed currency price reductions'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            {/* Section 1: General Info */}
            <div className='bg-muted/20 space-y-4 rounded-lg border p-4'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g. Black Friday 2026, Launch Special'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='code'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coupon Code (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g. SUMMER20 (leave empty for automatic API-only discounts)'
                        className='font-mono uppercase'
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Customers enter this code at checkout to claim the
                      discount.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section 2: Discount Value */}
            <div className='bg-muted/20 space-y-4 rounded-lg border p-4'>
              <h4 className='text-foreground flex items-center gap-2 text-sm font-semibold tracking-tight'>
                <Percent className='text-muted-foreground h-4 w-4' />
                Discount Value & Type
              </h4>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='type'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                        disabled={isEditing}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select type' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='percentage'>
                            Percentage Off (%)
                          </SelectItem>
                          <SelectItem value='fixed'>
                            Fixed Amount Off ($)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {discountType === 'percentage' ? (
                  <FormField
                    control={form.control}
                    name='percentage'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Percentage Value (%)</FormLabel>
                        <FormControl>
                          <div className='relative'>
                            <Input
                              type='number'
                              step='0.1'
                              min={0.1}
                              max={100}
                              placeholder='20'
                              className='pr-8 font-medium'
                              value={field.value}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ''
                                    ? 0
                                    : Number(e.target.value)
                                )
                              }
                            />
                            <span className='text-muted-foreground absolute top-2.5 right-3 font-semibold'>
                              %
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className='grid grid-cols-2 gap-2'>
                    <FormField
                      control={form.control}
                      name='fixedAmountDollars'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ($)</FormLabel>
                          <FormControl>
                            <div className='relative'>
                              <span className='text-muted-foreground absolute top-2.5 left-3 font-semibold'>
                                $
                              </span>
                              <Input
                                type='number'
                                step='0.01'
                                min={0.5}
                                placeholder='10.00'
                                className='pl-7 font-medium'
                                value={field.value}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value === ''
                                      ? 0
                                      : Number(e.target.value)
                                  )
                                }
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='currency'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder='Currency' />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value='usd'>USD</SelectItem>
                              <SelectItem value='eur'>EUR</SelectItem>
                              <SelectItem value='gbp'>GBP</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Duration & Limits */}
            <div className='bg-muted/20 space-y-4 rounded-lg border p-4'>
              <h4 className='text-foreground flex items-center gap-2 text-sm font-semibold tracking-tight'>
                <Clock className='text-muted-foreground h-4 w-4' />
                Duration & Redemption Limits
              </h4>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='duration'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select duration' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='once'>
                            Once (First invoice only)
                          </SelectItem>
                          <SelectItem value='forever'>
                            Forever (All recurring billing cycles)
                          </SelectItem>
                          <SelectItem value='repeating'>
                            Repeating (For a set number of months)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {duration === 'repeating' && (
                  <FormField
                    control={form.control}
                    name='durationInMonths'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Months to Repeat</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={1}
                            placeholder='3'
                            value={field.value}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ''
                                  ? 1
                                  : Number(e.target.value)
                              )
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          e.g. 3 for first 3 months of subscription
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name='maxRedemptionsInput'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Redemptions (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={1}
                          placeholder='Unlimited if blank'
                          value={field.value || ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>
                        Total times this coupon can be redeemed
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='startsAt'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starts At (Optional)</FormLabel>
                      <FormControl>
                        <Input type='date' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='endsAt'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expires At (Optional)</FormLabel>
                      <FormControl>
                        <Input type='date' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section 4: Product Restrictions */}
            <div className='bg-muted/20 space-y-4 rounded-lg border p-4'>
              <h4 className='text-foreground flex items-center gap-2 text-sm font-semibold tracking-tight'>
                <Package className='text-muted-foreground h-4 w-4' />
                Product Eligibility
              </h4>

              <FormField
                control={form.control}
                name='applyToAllProducts'
                render={({ field }) => (
                  <FormItem className='flex items-center space-y-0 space-x-2'>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className='text-sm font-medium'>
                      Apply to all products in catalog
                    </FormLabel>
                  </FormItem>
                )}
              />

              {!applyToAllProducts && (
                <div className='max-h-48 space-y-2 overflow-y-auto border-t pt-2'>
                  <p className='text-muted-foreground mb-2 text-xs'>
                    Select products eligible for this discount:
                  </p>
                  {products.map((p: any) => {
                    const isChecked = form
                      .watch('selectedProductIds')
                      .includes(p.id)
                    return (
                      <div
                        key={p.id}
                        className='flex items-center space-x-2 py-1'
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const current = form.getValues('selectedProductIds')
                            if (checked) {
                              form.setValue('selectedProductIds', [
                                ...current,
                                p.id,
                              ])
                            } else {
                              form.setValue(
                                'selectedProductIds',
                                current.filter((id) => id !== p.id)
                              )
                            }
                          }}
                        />
                        <span className='text-foreground text-sm'>
                          {p.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Section 5: Custom Metadata */}
            <div className='bg-muted/20 space-y-3 rounded-lg border p-4'>
              <h4 className='text-foreground flex items-center gap-2 text-sm font-semibold tracking-tight'>
                <Sparkles className='text-muted-foreground h-4 w-4' />
                Custom Metadata Attributes
              </h4>
              <MetadataEditor
                entries={metadataEntries}
                onChange={setMetadataEntries}
              />
            </div>

            <DialogFooter className='gap-2 sm:gap-0'>
              <Button
                type='button'
                variant='outline'
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {isEditing ? 'Save Changes' : 'Create Discount'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
