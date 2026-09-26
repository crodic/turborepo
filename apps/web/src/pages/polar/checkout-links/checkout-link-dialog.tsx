import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
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
import { useDataPaymentProductsOverview } from '@/pages/payment-products/queries'
import { useMutationCreateCheckoutLink } from '../queries'
import {
  createCheckoutLinkSchema,
  type CreateCheckoutLinkSchema,
} from '../schema'

interface CheckoutLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CheckoutLinkDialog({
  open,
  onOpenChange,
}: CheckoutLinkDialogProps) {
  const createMutation = useMutationCreateCheckoutLink()
  const { data: productsData } = useDataPaymentProductsOverview({})

  const form = useForm<CreateCheckoutLinkSchema>({
    resolver: zodResolver(createCheckoutLinkSchema),
    defaultValues: {
      productId: '',
      label: '',
      successUrl: '',
    },
  })

  const products = productsData?.data ?? []

  const onSubmit = (values: CreateCheckoutLinkSchema) => {
    const payload: any = {}
    if (values.productId?.trim()) payload.productId = values.productId.trim()
    if (values.label?.trim()) payload.label = values.label.trim()
    if (values.successUrl?.trim()) payload.successUrl = values.successUrl.trim()

    createMutation.mutate(payload, {
      onSuccess: () => {
        form.reset()
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Create Polar Checkout Link</DialogTitle>
          <DialogDescription>
            Generate a direct shareable payment URL for email campaigns, social
            posts, or custom buttons.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='productId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product / Tier</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a product...' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map((prod) => (
                        <SelectItem
                          key={prod.id}
                          value={prod.polarProductId || String(prod.id)}
                        >
                          {prod.name} ({prod.planSlug})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='label'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link Label (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g. Cyber Monday Promotion'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className='text-xs'>
                    An internal label to identify this checkout link.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='successUrl'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Success Redirect URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='https://my-app.com/success?checkout_id={CHECKOUT_ID}'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className='text-xs'>
                    Polar will redirect the customer here upon purchase
                    completion.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className='mr-2 size-4 animate-spin' />
                )}
                Generate Link
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
