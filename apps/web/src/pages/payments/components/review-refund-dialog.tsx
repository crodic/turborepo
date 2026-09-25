import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useMutationReviewRefundRequest } from '../queries'
import { type PaymentRefundRequestSchema } from '../schema'

const reviewFormSchema = z.object({
  action: z.enum(['approve', 'reject']),
  adminNote: z
    .string()
    .max(500, 'Note cannot exceed 500 characters')
    .optional(),
  refundAmount: z.number().positive('Amount must be greater than 0').optional(),
})

type ReviewFormValues = z.infer<typeof reviewFormSchema>

interface ReviewRefundDialogProps {
  request: PaymentRefundRequestSchema | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReviewRefundDialog({
  request,
  open,
  onOpenChange,
}: ReviewRefundDialogProps) {
  const reviewMutation = useMutationReviewRefundRequest()

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      action: 'approve',
      adminNote: '',
      refundAmount: request ? request.amount / 100 : 0,
    },
  })

  const action = form.watch('action')

  useEffect(() => {
    if (request && open) {
      form.reset({
        action: 'approve',
        adminNote: '',
        refundAmount: request.amount / 100,
      })
    }
  }, [request, open, form])

  const onSubmit = (values: ReviewFormValues) => {
    if (!request) return

    const amountInCents =
      values.action === 'approve' && values.refundAmount
        ? Math.round(values.refundAmount * 100)
        : undefined

    reviewMutation.mutate(
      {
        id: request.id,
        data: {
          action: values.action,
          adminNote: values.adminNote?.trim() || undefined,
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

  if (!request) return null

  const orderAmountFormatted = (request.amount / 100).toFixed(2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <span>Review Refund Request</span>
            <Badge variant='outline' className='font-mono text-xs'>
              #{request.id}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Process customer refund request for Order #{request.orderId}.
          </DialogDescription>
        </DialogHeader>

        {/* Request Details Summary */}
        <div className='border-border/60 bg-muted/40 space-y-2.5 rounded-lg border p-3.5 text-xs'>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground'>Requested Amount:</span>
            <span className='text-foreground font-semibold'>
              ${orderAmountFormatted} {request.currency.toUpperCase()}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground'>Reason:</span>
            <span className='text-foreground font-medium capitalize'>
              {request.reason.replace(/_/g, ' ')}
            </span>
          </div>
          {request.customerNote && (
            <div className='border-border/40 border-t pt-2'>
              <span className='text-muted-foreground mb-1 block'>
                Customer Note:
              </span>
              <p className='text-foreground bg-background/50 rounded p-2 italic'>
                &ldquo;{request.customerNote}&rdquo;
              </p>
            </div>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='action'
              render={({ field }) => (
                <FormItem className='space-y-2'>
                  <FormLabel>Decision</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className='grid grid-cols-2 gap-3'
                    >
                      <label
                        className={`border-border flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                          field.value === 'approve'
                            ? 'border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className='flex items-center gap-2'>
                          <RadioGroupItem value='approve' id='action-approve' />
                          <span className='text-sm font-medium'>
                            Approve Refund
                          </span>
                        </div>
                        <CheckCircle2 className='size-4 text-emerald-600 dark:text-emerald-400' />
                      </label>

                      <label
                        className={`border-border flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                          field.value === 'reject'
                            ? 'border-rose-600 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className='flex items-center gap-2'>
                          <RadioGroupItem value='reject' id='action-reject' />
                          <span className='text-sm font-medium'>
                            Reject Request
                          </span>
                        </div>
                        <XCircle className='size-4 text-rose-600 dark:text-rose-400' />
                      </label>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {action === 'approve' && (
              <FormField
                control={form.control}
                name='refundAmount'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Refund Amount (${request.currency.toUpperCase()})
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        min='0.01'
                        max={request.amount / 100}
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
                      Full refund is ${orderAmountFormatted}. You can adjust for
                      partial refund.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name='adminNote'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Internal Note / Reason{' '}
                    {action === 'reject' ? '(Recommended)' : '(Optional)'}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        action === 'approve'
                          ? 'Optional note regarding the refund approval...'
                          : 'Please specify the reason for rejecting this refund request...'
                      }
                      rows={3}
                      className='resize-none'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {action === 'approve' && (
              <div className='flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200'>
                <AlertCircle className='size-4 shrink-0 translate-y-0.5 text-amber-600 dark:text-amber-400' />
                <p>
                  Approving this refund will immediately initiate the gateway
                  refund via Polar, mark the order as refunded, and
                  automatically revoke any associated subscription benefits.
                </p>
              </div>
            )}

            <DialogFooter className='gap-2 sm:gap-0'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={reviewMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                variant={action === 'reject' ? 'destructive' : 'default'}
                disabled={reviewMutation.isPending}
              >
                {reviewMutation.isPending ? (
                  <>
                    <Loader2 className='mr-2 size-4 animate-spin' />
                    Processing...
                  </>
                ) : action === 'approve' ? (
                  'Approve & Execute Refund'
                ) : (
                  'Reject Request'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
