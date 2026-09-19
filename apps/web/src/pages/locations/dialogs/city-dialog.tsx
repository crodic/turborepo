import { useEffect, useState } from 'react'
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
import AutoCompleteSelectControl from '@/components/forms/auto-complete-select-control'
import {
  apiCreateCity,
  apiUpdateCity,
  usePublicCountriesQuery,
  usePublicStatesQuery,
} from '../queries'
import { type CityFormSchema, cityFormSchema, type CitySchema } from '../schema'

interface CityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  city?: CitySchema | null
  defaultCountryId?: string
  defaultStateId?: string
}

export function CityDialog({
  open,
  onOpenChange,
  city,
  defaultCountryId,
  defaultStateId,
}: CityDialogProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isEdit = !!city

  const [selectedCountryId, setSelectedCountryId] = useState<string>(
    city?.countryId || defaultCountryId || ''
  )

  const { data: countries } = usePublicCountriesQuery()
  const { data: states } = usePublicStatesQuery(selectedCountryId)

  const form = useForm<CityFormSchema>({
    resolver: zodResolver(cityFormSchema),
    defaultValues: {
      name: '',
      countryId: defaultCountryId || '',
      stateId: defaultStateId || '',
      code: '',
      stateCode: '',
      countryCode: '',
    },
  })

  useEffect(() => {
    if (city) {
      setSelectedCountryId(city.countryId || '')
      form.reset({
        name: city.name,
        countryId: city.countryId || '',
        stateId: city.stateId || '',
        code: city.code || '',
        stateCode: city.stateCode || '',
        countryCode: city.countryCode || '',
        latitude: city.latitude ?? undefined,
        longitude: city.longitude ?? undefined,
      })
    } else {
      const initCountry = defaultCountryId || ''
      setSelectedCountryId(initCountry)
      form.reset({
        name: '',
        countryId: initCountry,
        stateId: defaultStateId || '',
        code: '',
        stateCode: '',
        countryCode: '',
      })
    }
  }, [city, defaultCountryId, defaultStateId, form, open])

  const mutation = useMutation({
    mutationFn: (values: CityFormSchema) =>
      isEdit
        ? apiUpdateCity({ id: city.id, data: values })
        : apiCreateCity(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] })
      toast.success(
        isEdit
          ? t('locations.city.updated', 'City updated successfully')
          : t('locations.city.created', 'City created successfully')
      )
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Something went wrong')
    },
  })

  const onSubmit = (values: CityFormSchema) => {
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-137.5'>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('locations.city.editTitle', 'Edit City / District')
              : t('locations.city.createTitle', 'Create City / District')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'locations.city.dialogDesc',
              'Enter city details and assign it to a country and state / province.'
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
                    {t('locations.fields.country', 'Country')}
                  </FormLabel>
                  <FormControl>
                    <AutoCompleteSelectControl
                      {...field}
                      options={
                        countries?.map((c) => ({
                          id: c.id,
                          name: `${c.name}${c.iso2 ? ` (${c.iso2})` : ''}`,
                        })) || []
                      }
                      isClearable
                      onChange={(val) => {
                        const actual = (val as string) || ''
                        field.onChange(actual)
                        setSelectedCountryId(actual)
                        form.setValue('stateId', '')
                        const found = countries?.find((c) => c.id === actual)
                        if (found?.iso2) {
                          form.setValue('countryCode', found.iso2)
                        }
                      }}
                      placeholder={t(
                        'locations.placeholders.selectCountry',
                        'Select country'
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='stateId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('locations.fields.state', 'State / Province')}
                  </FormLabel>
                  <FormControl>
                    <AutoCompleteSelectControl
                      {...field}
                      options={
                        states?.map((s) => ({
                          id: s.id,
                          name: s.name,
                        })) || []
                      }
                      isClearable
                      isDisabled={!selectedCountryId}
                      onChange={(val) => {
                        const actual = (val as string) || ''
                        field.onChange(actual)
                        const found = states?.find((s) => s.id === actual)
                        if (found?.iso2) {
                          form.setValue('stateCode', found.iso2)
                        }
                      }}
                      placeholder={
                        !selectedCountryId
                          ? t(
                              'locations.placeholders.selectCountryFirst',
                              'Select country first'
                            )
                          : t(
                              'locations.placeholders.selectState',
                              'Select state / province'
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
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('locations.fields.name', 'City / District Name')} *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g. Ba Dinh, Manhattan, Shinjuku'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='code'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('locations.fields.code', 'Postal / City Code')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='100000, 10001'
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
