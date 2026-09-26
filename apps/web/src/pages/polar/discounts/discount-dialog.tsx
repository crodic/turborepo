import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDataPaymentProductsOverview } from '@/pages/polar/products/queries'
import {
  useMutationCreateDiscount,
  useMutationUpdateDiscount,
} from '../queries'
import {
  createDiscountSchema,
  type CreateDiscountSchema,
  type PolarDiscountSchema,
} from '../schema'

interface DiscountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  discount?: PolarDiscountSchema | null
}

export function DiscountDialog({
  open,
  onOpenChange,
  discount,
}: DiscountDialogProps) {
  const isEditing = Boolean(discount)
  const createMutation = useMutationCreateDiscount()
  const updateMutation = useMutationUpdateDiscount()
  const { data: productsData } = useDataPaymentProductsOverview({})
  const products = productsData?.data ?? []
  const [productSelection, setProductSelection] = useState<'all' | 'specific'>(
    'all'
  )
  const [isRestrictionsOpen, setIsRestrictionsOpen] = useState(true)

  const form = useForm<CreateDiscountSchema>({
    resolver: zodResolver(createDiscountSchema),
    defaultValues: {
      name: '',
      type: 'percentage',
      basisPoints: 2000,
      amount: undefined,
      currency: 'usd',
      duration: 'once',
      durationInMonths: undefined,
      code: '',
      maxRedemptions: undefined,
      maxRedemptionsPerCustomer: undefined,
      startsAt: '',
      endsAt: '',
      productIds: [],
    },
  })

  useEffect(() => {
    if (discount) {
      const hasSpecificProducts =
        discount.productIds && discount.productIds.length > 0
      setProductSelection(hasSpecificProducts ? 'specific' : 'all')
      form.reset({
        name: discount.name,
        type: discount.type,
        basisPoints: discount.basisPoints ?? undefined,
        amount: discount.amount ? discount.amount / 100 : undefined,
        currency: discount.currency || 'usd',
        duration: discount.duration,
        durationInMonths: discount.durationInMonths ?? undefined,
        code: discount.code || '',
        maxRedemptions: discount.maxRedemptions ?? undefined,
        maxRedemptionsPerCustomer:
          (discount.metadata as any)?.max_redemptions_per_customer ?? undefined,
        startsAt: discount.startsAt ? discount.startsAt.slice(0, 16) : '',
        endsAt: discount.endsAt ? discount.endsAt.slice(0, 16) : '',
        productIds: discount.productIds || [],
      })
    } else {
      setProductSelection('all')
      form.reset({
        name: '',
        type: 'percentage',
        basisPoints: 2000,
        amount: undefined,
        currency: 'usd',
        duration: 'once',
        durationInMonths: undefined,
        code: '',
        maxRedemptions: undefined,
        maxRedemptionsPerCustomer: undefined,
        startsAt: '',
        endsAt: '',
        productIds: [],
      })
    }
  }, [discount, form, open])

  const discountType = form.watch('type')
  const duration = form.watch('duration')

  const onSubmit = (values: CreateDiscountSchema) => {
    const payload: any = {
      name: values.name,
      type: values.type,
      duration: values.duration,
    }

    if (values.code?.trim()) {
      payload.code = values.code.trim().toUpperCase()
    }

    if (values.type === 'percentage') {
      payload.basisPoints = Number(values.basisPoints)
    } else if (values.type === 'fixed') {
      payload.amount = Math.round(Number(values.amount) * 100) // convert to cents
      payload.currency = values.currency || 'usd'
    }

    if (values.duration === 'repeating' && values.durationInMonths) {
      payload.durationInMonths = Number(values.durationInMonths)
    }

    if (
      productSelection === 'specific' &&
      values.productIds &&
      values.productIds.length > 0
    ) {
      payload.productIds = values.productIds
    }

    if (values.startsAt) {
      payload.startsAt = new Date(values.startsAt).toISOString()
    }

    if (values.endsAt) {
      payload.endsAt = new Date(values.endsAt).toISOString()
    }

    if (values.maxRedemptions) {
      payload.maxRedemptions = Number(values.maxRedemptions)
    }

    if (values.maxRedemptionsPerCustomer) {
      payload.metadata = {
        ...(payload.metadata || {}),
        max_redemptions_per_customer: Number(values.maxRedemptionsPerCustomer),
      }
    }

    if (isEditing && discount) {
      updateMutation.mutate(
        { id: discount.id, payload },
        {
          onSuccess: () => {
            onOpenChange(false)
          },
        }
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          onOpenChange(false)
        },
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Polar Discount' : 'Create New Polar Discount'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update discount parameters on Polar gateway.'
              : 'Add coupon codes or percentage/fixed discounts applicable at Polar checkout.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Name</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g. Summer Special 20%' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='code'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promo Code (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='SUMMER20'
                        className='font-mono uppercase'
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription className='text-xs'>
                      Leave empty for auto-applied
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Type</FormLabel>
                    <Select
                      disabled={isEditing}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select type' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='percentage'>
                          Percentage (% off)
                        </SelectItem>
                        <SelectItem value='fixed'>
                          Fixed Amount ($ off)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {discountType === 'percentage' ? (
              <FormField
                control={form.control}
                name='basisPoints'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Percentage (Basis Points)</FormLabel>
                    <FormControl>
                      <div className='flex items-center gap-2'>
                        <Input
                          type='number'
                          placeholder='2000'
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.valueAsNumber || undefined)
                          }
                        />
                        <span className='text-muted-foreground font-mono text-xs whitespace-nowrap'>
                          = {((field.value ?? 0) / 100).toFixed(0)}% OFF
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription className='text-xs'>
                      1000 = 10%, 2500 = 25%, 5000 = 50%
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='amount'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ($)</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          step='0.01'
                          placeholder='10.00'
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.valueAsNumber || undefined)
                          }
                        />
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
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Currency' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='usd'>USD ($)</SelectItem>
                          <SelectItem value='eur'>EUR (€)</SelectItem>
                          <SelectItem value='gbp'>GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div
              className={
                duration === 'repeating' ? 'grid grid-cols-2 gap-4' : ''
              }
            >
              <FormField
                control={form.control}
                name='duration'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <Select
                      disabled={isEditing}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Duration' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='once'>
                          Once (first invoice)
                        </SelectItem>
                        <SelectItem value='forever'>
                          Forever (all renewals)
                        </SelectItem>
                        <SelectItem value='repeating'>
                          Repeating (N months)
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
                      <FormLabel>Duration (Months)</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          placeholder='3'
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.valueAsNumber || undefined)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Restrictions Section */}
            <div className='bg-card text-card-foreground rounded-lg border shadow-sm'>
              <Collapsible
                open={isRestrictionsOpen}
                onOpenChange={setIsRestrictionsOpen}
              >
                <CollapsibleTrigger asChild>
                  <button
                    type='button'
                    className='hover:bg-muted/50 flex w-full items-center justify-between rounded-lg p-4 text-left font-medium transition-all'
                  >
                    <span className='text-sm font-semibold'>Restrictions</span>
                    <ChevronDown
                      className={cn(
                        'text-muted-foreground h-4 w-4 transition-transform duration-200',
                        isRestrictionsOpen && 'rotate-180'
                      )}
                    />
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className='space-y-4 px-4 pt-1 pb-4'>
                  {/* Products */}
                  <div className='space-y-1.5'>
                    <FormLabel className='text-sm font-medium'>
                      Products
                    </FormLabel>
                    <Select
                      value={productSelection}
                      onValueChange={(val) => {
                        setProductSelection(val as 'all' | 'specific')
                        if (val === 'all') {
                          form.setValue('productIds', [])
                        }
                      }}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='All products' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>All products</SelectItem>
                        <SelectItem value='specific'>
                          Selected products
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className='text-muted-foreground text-xs'>
                      Only the selected products will be eligible for the
                      discount.
                    </p>

                    {productSelection === 'specific' && (
                      <div className='bg-background mt-2 max-h-40 space-y-1.5 overflow-y-auto rounded-md border p-2'>
                        {products.length === 0 ? (
                          <p className='text-muted-foreground p-1 text-xs'>
                            No pricing plans available.
                          </p>
                        ) : (
                          products.map((p) => {
                            const targetId = p.polarProductId || String(p.id)
                            const isChecked = (
                              form.watch('productIds') ?? []
                            ).includes(targetId)
                            return (
                              <label
                                key={p.id}
                                className='hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded p-1.5 text-xs'
                              >
                                <input
                                  type='checkbox'
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const current =
                                      form.getValues('productIds') ?? []
                                    if (e.target.checked) {
                                      form.setValue('productIds', [
                                        ...current,
                                        targetId,
                                      ])
                                    } else {
                                      form.setValue(
                                        'productIds',
                                        current.filter((id) => id !== targetId)
                                      )
                                    }
                                  }}
                                  className='text-primary focus:ring-primary rounded border-gray-300'
                                />
                                <span className='font-medium'>{p.name}</span>
                                <span className='text-muted-foreground ml-auto'>
                                  ${(p.price / 100).toFixed(2)}
                                </span>
                              </label>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Starts at */}
                  <FormField
                    control={form.control}
                    name='startsAt'
                    render={({ field }) => (
                      <FormItem className='space-y-1.5'>
                        <FormLabel className='text-sm font-medium'>
                          Starts at
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant='outline'
                                className={cn(
                                  'h-9 w-full justify-between px-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(new Date(field.value), 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className='h-4 w-4 opacity-50' />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className='w-auto p-0' align='start'>
                            <Calendar
                              mode='single'
                              selected={
                                field.value ? new Date(field.value) : undefined
                              }
                              onSelect={(date) => {
                                field.onChange(date ? date.toISOString() : '')
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Ends at */}
                  <FormField
                    control={form.control}
                    name='endsAt'
                    render={({ field }) => (
                      <FormItem className='space-y-1.5'>
                        <FormLabel className='text-sm font-medium'>
                          Ends at
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant='outline'
                                className={cn(
                                  'h-9 w-full justify-between px-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(new Date(field.value), 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className='h-4 w-4 opacity-50' />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className='w-auto p-0' align='start'>
                            <Calendar
                              mode='single'
                              selected={
                                field.value ? new Date(field.value) : undefined
                              }
                              onSelect={(date) => {
                                field.onChange(date ? date.toISOString() : '')
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Maximum number of redemptions */}
                  <FormField
                    control={form.control}
                    name='maxRedemptions'
                    render={({ field }) => (
                      <FormItem className='space-y-1.5'>
                        <FormLabel className='text-sm font-medium'>
                          Maximum number of redemptions
                        </FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            placeholder=''
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(
                                e.target.valueAsNumber || undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormDescription className='text-muted-foreground text-xs'>
                          Counts every redemption, across all customers.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Maximum redemptions per customer */}
                  <FormField
                    control={form.control}
                    name='maxRedemptionsPerCustomer'
                    render={({ field }) => (
                      <FormItem className='space-y-1.5'>
                        <FormLabel className='text-sm font-medium'>
                          Maximum redemptions per customer
                        </FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            placeholder=''
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(
                                e.target.valueAsNumber || undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormDescription className='text-muted-foreground text-xs'>
                          Counts redemptions per customer.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>

            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending && <Loader2 className='mr-2 size-4 animate-spin' />}
                {isEditing ? 'Save Changes' : 'Create Discount'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
