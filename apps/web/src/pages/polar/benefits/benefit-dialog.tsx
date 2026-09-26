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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useMutationCreateBenefit } from '../queries'
import { createBenefitSchema, type CreateBenefitSchema } from '../schema'

interface BenefitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BenefitDialog({ open, onOpenChange }: BenefitDialogProps) {
  const createMutation = useMutationCreateBenefit()

  const form = useForm<CreateBenefitSchema>({
    resolver: zodResolver(createBenefitSchema),
    defaultValues: {
      type: 'custom',
      description: '',
      isTaxApplicable: false,
      note: '',
    },
  })

  const watchedType = form.watch('type')

  const onSubmit = (values: CreateBenefitSchema) => {
    const payload: any = {
      type: values.type,
      description: values.description.trim(),
      isTaxApplicable: values.isTaxApplicable,
    }

    if (values.type === 'custom' && values.note?.trim()) {
      payload.properties = { note: values.note.trim() }
    }

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
          <DialogTitle>Create Polar Benefit</DialogTitle>
          <DialogDescription>
            Provision a new entitlement benefit to attach to your products and
            subscription tiers.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Benefit Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select type' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='custom'>
                        Custom (Manual / Note)
                      </SelectItem>
                      <SelectItem value='license_keys'>
                        License Keys (Automated Key Generator)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g. Access to Private Discord VIP Lounge'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className='text-xs'>
                    Displayed on checkout and in the customer portal.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedType === 'custom' && (
              <FormField
                control={form.control}
                name='note'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secret Note (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Private instructions, secret link, or voucher details revealed to the customer upon purchase...'
                        className='resize-none text-xs'
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name='isTaxApplicable'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs'>
                  <div className='space-y-0.5'>
                    <FormLabel>Tax Applicable</FormLabel>
                    <FormDescription className='text-xs'>
                      Subject to sales tax / VAT determination by Polar.
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
                Create Benefit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
