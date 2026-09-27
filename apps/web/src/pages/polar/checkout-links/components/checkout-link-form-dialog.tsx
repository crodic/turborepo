import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Link2,
  Package,
  Tag,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Clock,
  Users,
  Sparkles,
} from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import {
  MetadataEditor,
  type MetadataEntry,
  metadataEntriesToObject,
  objectToMetadataEntries,
} from '../../components/metadata-editor'
import {
  useMutationCreatePolarCheckoutLink,
  useMutationUpdatePolarCheckoutLink,
  useDataPolarProducts,
  useDataPolarDiscounts,
} from '../../queries'
import { formatPolarPrice } from '../../utils'

const checkoutLinkFormSchema = z.object({
  label: z.string().max(100).optional(),
  selectedProductIds: z
    .array(z.string())
    .min(1, 'Please select at least one product for this checkout link'),
  discountId: z.string().optional(),
  allowDiscountCodes: z.boolean(),
  requireBillingAddress: z.boolean(),
  hasTrial: z.boolean(),
  trialInterval: z.enum(['day', 'week', 'month', 'year']),
  trialIntervalCount: z.number().min(1),
  seatsInput: z.string().optional(),
  successUrl: z
    .string()
    .url('Must be a valid URL (e.g. https://example.com/success)')
    .optional()
    .or(z.literal('')),
  returnUrl: z
    .string()
    .url('Must be a valid URL (e.g. https://example.com/pricing)')
    .optional()
    .or(z.literal('')),
})

type CheckoutLinkFormValues = z.infer<typeof checkoutLinkFormSchema>

interface CheckoutLinkFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  checkoutLink?: any | null
}

export function CheckoutLinkFormDialog({
  open,
  onOpenChange,
  checkoutLink,
}: CheckoutLinkFormDialogProps) {
  const isEditing = Boolean(checkoutLink)
  const { mutate: createLink, isPending: isCreating } =
    useMutationCreatePolarCheckoutLink()
  const { mutate: updateLink, isPending: isUpdating } =
    useMutationUpdatePolarCheckoutLink()

  // Fetch available products and discounts for dropdowns/checkboxes
  const { data: productsData } = useDataPolarProducts({ limit: 100 })
  const { data: discountsData } = useDataPolarDiscounts({ limit: 100 })

  const products = useMemo(() => productsData?.data || [], [productsData?.data])
  const discounts = useMemo(
    () => discountsData?.data || [],
    [discountsData?.data]
  )

  const [metadataEntries, setMetadataEntries] = useState<MetadataEntry[]>([])

  const form = useForm<CheckoutLinkFormValues>({
    resolver: zodResolver(checkoutLinkFormSchema),
    defaultValues: {
      label: '',
      selectedProductIds: [],
      discountId: '',
      allowDiscountCodes: true,
      requireBillingAddress: false,
      hasTrial: false,
      trialInterval: 'day',
      trialIntervalCount: 7,
      seatsInput: '',
      successUrl: '',
      returnUrl: '',
    },
  })

  useEffect(() => {
    if (checkoutLink && open) {
      let initialProductIds: string[] = []
      if (Array.isArray(checkoutLink.products)) {
        initialProductIds = checkoutLink.products.map((p: any) =>
          typeof p === 'string' ? p : p.id
        )
      } else if (checkoutLink.productId || checkoutLink.product_id) {
        initialProductIds = [checkoutLink.productId || checkoutLink.product_id]
      }

      setMetadataEntries(objectToMetadataEntries(checkoutLink.metadata))

      form.reset({
        label: checkoutLink.label || '',
        selectedProductIds: initialProductIds,
        discountId:
          checkoutLink.discountId ||
          checkoutLink.discount_id ||
          checkoutLink.discount?.id ||
          '',
        allowDiscountCodes: checkoutLink.allowDiscountCodes ?? true,
        requireBillingAddress: checkoutLink.requireBillingAddress ?? false,
        hasTrial: Boolean(checkoutLink.trialInterval),
        trialInterval: checkoutLink.trialInterval || 'day',
        trialIntervalCount: checkoutLink.trialIntervalCount || 7,
        seatsInput: checkoutLink.seats ? String(checkoutLink.seats) : '',
        successUrl: checkoutLink.successUrl || checkoutLink.success_url || '',
        returnUrl: checkoutLink.returnUrl || checkoutLink.return_url || '',
      })
    } else if (!checkoutLink && open) {
      setMetadataEntries([])
      form.reset({
        label: '',
        selectedProductIds: products.length > 0 ? [products[0].id] : [],
        discountId: '',
        allowDiscountCodes: true,
        requireBillingAddress: false,
        hasTrial: false,
        trialInterval: 'day',
        trialIntervalCount: 7,
        seatsInput: '',
        successUrl: '',
        returnUrl: '',
      })
    }
  }, [checkoutLink, open, form, products])

  const onSubmit = (values: CheckoutLinkFormValues) => {
    const seats =
      values.seatsInput && values.seatsInput.trim() !== ''
        ? Number(values.seatsInput)
        : undefined

    const metadataObj = metadataEntriesToObject(metadataEntries)

    if (isEditing && checkoutLink) {
      updateLink(
        {
          id: checkoutLink.id,
          payload: {
            label: values.label || undefined,
            products: values.selectedProductIds,
            discountId:
              values.discountId && values.discountId !== ''
                ? values.discountId
                : undefined,
            allowDiscountCodes: values.allowDiscountCodes,
            requireBillingAddress: values.requireBillingAddress,
            trialInterval: values.hasTrial ? values.trialInterval : null,
            trialIntervalCount: values.hasTrial
              ? values.trialIntervalCount
              : null,
            seats,
            successUrl: values.successUrl || undefined,
            returnUrl: values.returnUrl || undefined,
            metadata: metadataObj,
          },
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      )
    } else {
      createLink(
        {
          label: values.label || undefined,
          products: values.selectedProductIds,
          discountId:
            values.discountId && values.discountId !== ''
              ? values.discountId
              : undefined,
          allowDiscountCodes: values.allowDiscountCodes,
          requireBillingAddress: values.requireBillingAddress,
          trialInterval: values.hasTrial ? values.trialInterval : undefined,
          trialIntervalCount: values.hasTrial
            ? values.trialIntervalCount
            : undefined,
          seats,
          successUrl: values.successUrl || undefined,
          returnUrl: values.returnUrl || undefined,
          metadata: metadataObj,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      )
    }
  }

  const isPending = isCreating || isUpdating
  const hasTrial = form.watch('hasTrial')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[92vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <div className='text-primary flex items-center gap-2'>
            <Link2 className='h-5 w-5' />
            <DialogTitle>
              {isEditing ? 'Edit Checkout Link' : 'Create Checkout Link'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isEditing
              ? `Update checkout link settings for ${checkoutLink?.label || checkoutLink?.id}`
              : 'Create a pre-configured shareable checkout link for your marketing campaigns'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            {/* Section 1: Label & Product Selection */}
            <div className='bg-muted/20 space-y-4 rounded-lg border p-4'>
              <FormField
                control={form.control}
                name='label'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Label (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g. Product Hunt Launch, Twitter Bio CTA'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Helps your team identify and track this checkout link.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='space-y-2'>
                <FormLabel className='flex items-center gap-1.5'>
                  <Package className='text-primary h-4 w-4' />
                  Products available on Checkout
                </FormLabel>
                <div className='bg-background max-h-44 space-y-2 overflow-y-auto rounded-md border p-3'>
                  {products.map((p: any) => {
                    const isSelected = form
                      .watch('selectedProductIds')
                      .includes(p.id)
                    const prices = p.prices || []
                    const activePrices = prices.filter(
                      (pr: any) => !pr.isArchived
                    )
                    const formatted =
                      activePrices.length > 0
                        ? activePrices
                            .map((pr: any) =>
                              formatPolarPrice(pr, p.recurringInterval)
                            )
                            .join(' / ')
                        : 'Free'

                    return (
                      <div
                        key={p.id}
                        className='flex items-center space-x-2 py-1'
                      >
                        <Checkbox
                          checked={isSelected}
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
                        <span className='text-foreground text-sm font-medium'>
                          {p.name}
                        </span>
                        <span className='text-muted-foreground text-xs'>
                          ({formatted}
                          {p.isRecurring ? '/sub' : ''})
                        </span>
                      </div>
                    )
                  })}
                </div>
                <FormMessage>
                  {form.formState.errors.selectedProductIds?.message}
                </FormMessage>
              </div>

              <FormField
                control={form.control}
                name='discountId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center gap-1.5'>
                      <Tag className='h-4 w-4 text-emerald-600' />
                      Auto-Applied Discount (Optional)
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='None (no coupon attached)' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value=''>
                          None (no coupon attached)
                        </SelectItem>
                        {discounts.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name} {d.code ? `(${d.code})` : ''} -{' '}
                            {d.type === 'percentage'
                              ? `${(d.basisPoints ?? d.basis_points ?? 0) / 100}% off`
                              : `$${((d.amount ?? 0) / 100).toFixed(2)} off`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Automatically applies this discount when customer opens
                      the link.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section 2: Checkout Policy & Seats */}
            <div className='bg-muted/20 space-y-4 rounded-lg border p-4'>
              <h4 className='text-foreground flex items-center gap-2 text-sm font-semibold tracking-tight'>
                <ShieldCheck className='text-muted-foreground h-4 w-4' />
                Checkout Behavior & Policies
              </h4>

              <div className='space-y-3'>
                <FormField
                  control={form.control}
                  name='allowDiscountCodes'
                  render={({ field }) => (
                    <FormItem className='bg-background flex items-center justify-between rounded-md border p-3'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-sm font-medium'>
                          Allow Custom Promo Codes
                        </FormLabel>
                        <FormDescription>
                          Customers can enter alternative coupon codes at
                          checkout
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
                  name='requireBillingAddress'
                  render={({ field }) => (
                    <FormItem className='bg-background flex items-center justify-between rounded-md border p-3'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-sm font-medium'>
                          Require Full Billing Address
                        </FormLabel>
                        <FormDescription>
                          Prompt customer for street address, city, and zip code
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

              {/* Free Trial Override */}
              <div className='space-y-3 border-t pt-2'>
                <FormField
                  control={form.control}
                  name='hasTrial'
                  render={({ field }) => (
                    <FormItem className='bg-background flex items-center justify-between rounded-md border p-3'>
                      <div className='space-y-0.5'>
                        <FormLabel className='flex items-center gap-1.5 text-sm font-medium'>
                          <Clock className='text-primary h-4 w-4' />
                          Override Free Trial Period
                        </FormLabel>
                        <FormDescription>
                          Set a link-specific trial period for marketing
                          promotions
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
                  <div className='grid grid-cols-1 gap-4 pl-2 sm:grid-cols-2'>
                    <FormField
                      control={form.control}
                      name='trialIntervalCount'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trial Duration Count</FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              min={1}
                              placeholder='14'
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='trialInterval'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trial Unit</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder='Select unit' />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value='day'>Day(s)</SelectItem>
                              <SelectItem value='week'>Week(s)</SelectItem>
                              <SelectItem value='month'>Month(s)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Preconfigured Seats */}
              <div className='border-t pt-2'>
                <FormField
                  control={form.control}
                  name='seatsInput'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Users className='text-muted-foreground h-4 w-4' />
                        Locked Seat Count (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={1}
                          placeholder='e.g. 5 (for seat-based pricing plans)'
                          value={field.value || ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>
                        Lock checkout sessions created from this link to a
                        specific seat number.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section 3: Redirect URLs */}
            <div className='bg-muted/20 space-y-4 rounded-lg border p-4'>
              <h4 className='text-foreground flex items-center gap-2 text-sm font-semibold tracking-tight'>
                <ExternalLink className='text-muted-foreground h-4 w-4' />
                Redirect URLs
              </h4>

              <FormField
                control={form.control}
                name='successUrl'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Success Redirect URL (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='https://yourdomain.com/payment/success?session_id={CHECKOUT_ID}'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Supports <code>{'{CHECKOUT_ID}'}</code> token to identify
                      the session.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='returnUrl'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Return / Back URL (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='https://yourdomain.com/pricing'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Back button shown on checkout to return to your website.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section 4: Custom Metadata */}
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
                {isEditing ? 'Save Changes' : 'Create Checkout Link'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
