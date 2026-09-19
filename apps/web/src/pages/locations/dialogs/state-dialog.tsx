import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import http from '@/lib/http'
import { PaginateQueryBuilder } from '@/lib/query-builder'
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
import AutoCompleteAsyncSelectControl from '@/components/forms/auto-complete-async-select-control'
import { apiCreateState, apiUpdateState } from '../queries'
import {
  type StateFormSchema,
  stateFormSchema,
  type StateSchema,
} from '../schema'

interface StateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  state?: StateSchema | null
  defaultCountryId?: string
}

export function StateDialog({
  open,
  onOpenChange,
  state,
  defaultCountryId,
}: StateDialogProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isEdit = !!state

  const form = useForm<StateFormSchema>({
    resolver: zodResolver(stateFormSchema),
    defaultValues: {
      name: '',
      countryId: defaultCountryId || '',
      countryCode: '',
      iso2: '',
      type: '',
      timezone: '',
    },
  })

  useEffect(() => {
    if (state) {
      form.reset({
        name: state.name,
        countryId: state.countryId,
        countryCode: state.countryCode || '',
        iso2: state.iso2 || '',
        type: state.type || '',
        timezone: state.timezone || '',
        latitude: state.latitude ?? undefined,
        longitude: state.longitude ?? undefined,
      })
    } else {
      form.reset({
        name: '',
        countryId: defaultCountryId || '',
        countryCode: '',
        iso2: '',
        type: '',
        timezone: '',
      })
    }
  }, [state, defaultCountryId, form, open])

  const mutation = useMutation({
    mutationFn: (values: StateFormSchema) =>
      isEdit
        ? apiUpdateState({ id: state.id, data: values })
        : apiCreateState(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['states'] })
      queryClient.invalidateQueries({ queryKey: ['public-states'] })
      toast.success(
        isEdit
          ? t(
              'locations.state.updated',
              'State / Province updated successfully'
            )
          : t(
              'locations.state.created',
              'State / Province created successfully'
            )
      )
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Something went wrong')
    },
  })

  const onSubmit = (values: StateFormSchema) => {
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-137.5'>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('locations.state.editTitle', 'Edit State / Province')
              : t('locations.state.createTitle', 'Create State / Province')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'locations.state.dialogDesc',
              'Add or update state / province information and assign it to a country.'
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='countryId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('locations.fields.country', 'Country')} *
                  </FormLabel>
                  <FormControl>
                    <AutoCompleteAsyncSelectControl
                      {...field}
                      placeholder={t(
                        'locations.placeholders.selectCountry',
                        'Select a country'
                      )}
                      defaultOption={
                        state?.country
                          ? {
                              value: state.country.id,
                              label: `${state.country.name}${state.country.iso2 ? ` (${state.country.iso2})` : ''}`,
                            }
                          : undefined
                      }
                      fetchOptions={async (search, page) => {
                        const builder = new PaginateQueryBuilder()
                          .page(page)
                          .limit(15)
                          .search(search)
                          .sortBy('name', 'ASC')
                        const res = await http.get('/countries', {
                          params: builder.build(),
                        })
                        return {
                          data: res.data.data.map((c: any) => ({
                            value: c.id,
                            label: `${c.name}${c.iso2 ? ` (${c.iso2})` : ''}`,
                            iso2: c.iso2,
                          })),
                          hasMore: page < (res.data.meta?.totalPages ?? 1),
                        }
                      }}
                      onChange={(val) => {
                        field.onChange(val as string)
                      }}
                      onSelectOption={(opt: any) => {
                        if (opt?.iso2) {
                          form.setValue('countryCode', opt.iso2)
                        } else if (!opt) {
                          form.setValue('countryCode', '')
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('locations.fields.name', 'State / Province Name')} *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g. Hanoi, California, Tokyo'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='iso2'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('locations.fields.code', 'State Code / ISO2')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='HN, CA, 13'
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('locations.fields.type', 'Type')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='province, state, city'
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='timezone'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('locations.fields.timezone', 'Timezone')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Asia/Ho_Chi_Minh, America/Los_Angeles'
                      {...field}
                      value={field.value ?? ''}
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
