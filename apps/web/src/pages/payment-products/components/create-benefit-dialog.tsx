import { useCallback } from 'react'
import z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import { useMutationCreateBenefit } from '../queries'
import type { PolarBenefitSchema } from '../schema'

const createBenefitFormSchema = z.object({
  type: z.enum(['custom', 'license_keys']),
  description: z.string().trim().min(1, 'Description is required'),
  note: z.string().optional(),
})

type CreateBenefitFormValues = z.infer<typeof createBenefitFormSchema>

interface CreateBenefitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (benefit: PolarBenefitSchema) => void
}

export function CreateBenefitDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateBenefitDialogProps) {
  const { t } = useTranslation()
  const createMutation = useMutationCreateBenefit()

  const form = useForm<CreateBenefitFormValues>({
    resolver: zodResolver(createBenefitFormSchema),
    defaultValues: {
      type: 'custom',
      description: '',
      note: '',
    },
  })

  const watchedType = form.watch('type')

  const handleSubmit = useCallback(
    (values: CreateBenefitFormValues) => {
      const payload: {
        type: string
        description: string
        properties?: { note?: string }
      } = {
        type: values.type,
        description: values.description,
      }

      if (values.type === 'custom' && values.note) {
        payload.properties = { note: values.note }
      }

      createMutation.mutate(payload, {
        onSuccess: (data: any) => {
          form.reset()
          onOpenChange(false)
          onCreated?.(data)
        },
      })
    },
    [createMutation, form, onOpenChange, onCreated]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {t('paymentProducts.createBenefit', {
              defaultValue: 'Create Benefit',
            })}
          </DialogTitle>
          <DialogDescription>
            {t('paymentProducts.createBenefitDesc', {
              defaultValue:
                'Create a new benefit on Polar to attach to products.',
            })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('paymentProducts.benefitType', {
                      defaultValue: 'Benefit Type',
                    })}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='custom'>Custom</SelectItem>
                      <SelectItem value='license_keys'>License Keys</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className='text-xs'>
                    {t('paymentProducts.benefitTypeDesc', {
                      defaultValue:
                        'Custom benefits show a note to customers. License keys generate activation keys.',
                    })}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('paymentProducts.benefitDescription', {
                      defaultValue: 'Description',
                    })}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g. Priority 24/7 Support'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className='text-xs'>
                    {t('paymentProducts.benefitDescriptionHelp', {
                      defaultValue:
                        'Displayed to customers when viewing this benefit.',
                    })}
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
                    <FormLabel>
                      {t('paymentProducts.benefitNote', {
                        defaultValue: 'Note (Markdown)',
                      })}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='e.g. Join our Discord: https://discord.gg/...'
                        rows={3}
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription className='text-xs'>
                      {t('paymentProducts.benefitNoteHelp', {
                        defaultValue:
                          'Markdown note shown to customers after purchase.',
                      })}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                {t('buttons.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button type='submit' disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className='mr-2 size-4 animate-spin' />
                )}
                {t('buttons.create', { defaultValue: 'Create' })}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
