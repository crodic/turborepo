import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, RotateCcw } from 'lucide-react'
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
import {
  directRefundSchema,
  type DirectRefundSchema,
  type PolarOrderSchema,
} from '../schema'

interface DirectRefundDialogProps {
  order: PolarOrderSchema | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DirectRefundDialog({
  order,
  open,
  onOpenChange,
}: DirectRefundDialogProps) {
  const refundMutation = useMutationDirectRefundOrder()

  const form = useForm<DirectRefundSchema>({
    resolver: zodResolver(directRefundSchema),
    defaultValues: {
      reason: 'customer_request',
      comment: '',
      refundAmount: undefined,
    },
  })

  if (!order) return null

  const maxRefundableDollars = order.amount / 100

  const onSubmit = (values: DirectRefundSchema) => {
    const payload: any = {
      reason: values.reason,
    }
    if (values.comment?.trim()) payload.comment = values.comment.trim()
    if (values.refundAmount != null && values.refundAmount > 0) {
      payload.refundAmount = Math.round(values.refundAmount * 100) // cents
    }

    refundMutation.mutate(
      { id: order.id, data: payload },
      {
        onSuccess: () => {
          form.reset()
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <RotateCcw className='size-5 text-amber-600' />
            Direct Order Refund
          </DialogTitle>
          <DialogDescription>
            Issue a full or partial refund for order #{order.orderNumber} (
            {order.customerEmail}) via Polar.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <div className='bg-muted/40 space-y-1 rounded-md border p-3 text-xs'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Order Total:</span>
                <span className='font-mono font-semibold'>
                  ${maxRefundableDollars.toFixed(2)}{' '}
                  {order.currency.toUpperCase()}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Polar Payment ID:</span>
                <span className='font-mono'>
                  {order.polarOrderId || order.id}
                </span>
              </div>
            </div>

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
                        <SelectValue placeholder='Select reason' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='customer_request'>
                        Customer Request
                      </SelectItem>
                      <SelectItem value='satisfaction_guarantee'>
                        Satisfaction Guarantee
                      </SelectItem>
                      <SelectItem value='duplicate'>
                        Duplicate Charge
                      </SelectItem>
                      <SelectItem value='fraudulent'>
                        Fraudulent / Disputed
                      </SelectItem>
                      <SelectItem value='other'>Other</SelectItem>
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
                  <FormLabel>Refund Amount ($)</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='0.01'
                      max={maxRefundableDollars}
                      placeholder={`Full refund ($${maxRefundableDollars.toFixed(2)})`}
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.valueAsNumber || undefined)
                      }
                    />
                  </FormControl>
                  <FormDescription className='text-xs'>
                    Leave blank to refund the full order amount.
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
                  <FormLabel>Audit Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Reason for refund...'
                      className='resize-none text-xs'
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className='pt-2'>
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
                {refundMutation.isPending && (
                  <Loader2 className='mr-2 size-4 animate-spin' />
                )}
                Confirm Refund
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
