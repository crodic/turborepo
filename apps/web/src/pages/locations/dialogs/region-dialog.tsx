import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { apiCreateRegion, apiUpdateRegion } from '../queries'
import {
  type RegionFormSchema,
  regionFormSchema,
  type RegionSchema,
} from '../schema'

interface RegionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  region?: RegionSchema | null
}

export function RegionDialog({
  open,
  onOpenChange,
  region,
}: RegionDialogProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isEdit = !!region

  const form = useForm<RegionFormSchema>({
    resolver: zodResolver(regionFormSchema),
    defaultValues: {
      name: '',
    },
  })

  useEffect(() => {
    if (region) {
      form.reset({
        name: region.name,
      })
    } else {
      form.reset({
        name: '',
      })
    }
  }, [region, form, open])

  const mutation = useMutation({
    mutationFn: (values: RegionFormSchema) =>
      isEdit
        ? apiUpdateRegion({ id: region.id, data: values })
        : apiCreateRegion(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] })
      queryClient.invalidateQueries({ queryKey: ['public-regions'] })
      toast.success(
        isEdit
          ? t('locations.region.updated', 'Region updated successfully')
          : t('locations.region.created', 'Region created successfully')
      )
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Something went wrong')
    },
  })

  const onSubmit = (values: RegionFormSchema) => {
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-112.5'>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('locations.region.editTitle', 'Edit Region')
              : t('locations.region.createTitle', 'Create Region')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'locations.region.dialogDesc',
              'Enter the details for this geographical region.'
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('locations.fields.name', 'Name')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(
                        'locations.region.namePlaceholder',
                        'e.g. Asia, Europe'
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className='pt-4'>
              <Button
                type='button'
                variant='outline'
                disabled={mutation.isPending}
                onClick={() => onOpenChange(false)}
              >
                {t('buttons.cancel', 'Cancel')}
              </Button>
              <Button type='submit' disabled={mutation.isPending}>
                {mutation.isPending
                  ? t('buttons.saving', 'Saving...')
                  : isEdit
                    ? t('buttons.save', 'Save Changes')
                    : t('buttons.create', 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
