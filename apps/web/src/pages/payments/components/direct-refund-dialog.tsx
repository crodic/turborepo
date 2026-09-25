import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { useMutationDirectRefundOrder } from '../queries'
import { type PaymentOrderSchema } from '../schema'

const directRefundFormSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  comment: z
    .string()
    .max(500, 'Comment cannot exceed 500 characters')
    .optional(),
  refundAmount: z.number().positive('Amount must be greater than 0').optional(),
})

type DirectRefundFormValues = z.infer<typeof directRefundFormSchema>

interface DirectRefundDialogProps {
  order: PaymentOrderSchema | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const refundReasons = [
  { value: 'customer_request', label: 'Customer Request' },
  { value: 'satisfaction_guarantee', label: 'Satisfaction Guarantee' },
  { value: 'service_disruption', label: 'Service Disruption' },
  { value: 'duplicate', label: 'Duplicate Charge' },
  { value: 'fraudulent', label: 'Fraudulent Charge' },
  { value: 'other', label: 'Other' },
]

export function DirectRefundDialog({
  order,
  open,
  onOpenChange,
}: DirectRefundDialogProps) {
  const refundMutation = useMutationDirectRefundOrder()

  const form = useForm<DirectRefundFormValues>({
    resolver: zodResolver(directRefundFormSchema),
    defaultValues: {
      reason: 'customer_request',
      comment: '',
      refundAmount: order ? order.amount / 100 : 0,
    },
  })

  useEffect(() => {
    if (order && open) {
      form.reset({
        reason: 'customer_request',
        comment: '',
        refundAmount: order.amount / 100,
      })
    }
  }, [order, open, form])

  const onSubmit = (values: DirectRefundFormValues) => {
    if (!order) return

    const amountInCents = values.refundAmount
      ? Math.round(values.refundAmount * 100)
      : undefined

    refundMutation.mutate(
      {
        id: order.id,
        data: {
          reason: values.reason,
          comment: values.comment?.trim() || undefined,
          amount: amountInCents,
        },
      },
      {
        onSuccess: () => {
          form.reset()
          onOpenChange(false)
        },
      }
    )
  }

  if (!order) return null

  const orderAmountFormatted = (order.amount / 100).toFixed(2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <span>Issue Direct Refund</span>
            <Badge variant='outline' className='font-mono text-xs'>
              {order.orderNumber}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Directly refund Order #{order.orderNumber} ({order.customerEmail}).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='reason'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Refund Reason</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a reason' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {refundReasons.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
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
              name='refundAmount'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Refund Amount (${order.currency.toUpperCase()})
                  </FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='0.01'
                      min='0.01'
                      max={order.amount / 100}
                      placeholder={orderAmountFormatted}
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ''
                            ? undefined
                            : Number(e.target.value)
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Full refund amount is ${orderAmountFormatted}.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='comment'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Admin Comment / Internal Note (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Reason for manual refund...'
                      rows={3}
                      className='resize-none'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200'>
              <AlertCircle className='size-4 shrink-0 translate-y-0.5 text-amber-600 dark:text-amber-400' />
              <p>
                This operation will call Polar Gateway API to transfer funds
                back to the customer, mark the order as refunded, and revoke
                active benefits.
              </p>
            </div>

            <DialogFooter className='gap-2 sm:gap-0'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={refundMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                variant='destructive'
                disabled={refundMutation.isPending}
              >
                {refundMutation.isPending ? (
                  <>
                    <Loader2 className='mr-2 size-4 animate-spin' />
                    Processing Refund...
                  </>
                ) : (
                  'Execute Refund'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
