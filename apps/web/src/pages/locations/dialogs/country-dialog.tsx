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
import AutoCompleteSelectControl from '@/components/forms/auto-complete-select-control'
import {
  apiCreateCountry,
  apiUpdateCountry,
  usePublicRegionsQuery,
} from '../queries'
import {
  type CountryFormSchema,
  countryFormSchema,
  type CountrySchema,
} from '../schema'

interface CountryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  country?: CountrySchema | null
}

export function CountryDialog({
  open,
  onOpenChange,
  country,
}: CountryDialogProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isEdit = !!country

  const { data: regions } = usePublicRegionsQuery()

  const form = useForm<CountryFormSchema>({
    resolver: zodResolver(countryFormSchema),
    defaultValues: {
      name: '',
      iso2: '',
      iso3: '',
      numericCode: '',
      phonecode: '',
      capital: '',
      currency: '',
      currencyName: '',
      currencySymbol: '',
      native: '',
      subregion: '',
      regionId: '',
    },
  })

  useEffect(() => {
    if (country) {
      form.reset({
        name: country.name,
        iso2: country.iso2 || '',
        iso3: country.iso3 || '',
        numericCode: country.numericCode || '',
        phonecode: country.phonecode || '',
        capital: country.capital || '',
        currency: country.currency || '',
        currencyName: country.currencyName || '',
        currencySymbol: country.currencySymbol || '',
        native: country.native || '',
        subregion: country.subregion || '',
        regionId: country.regionId || '',
        latitude: country.latitude ?? undefined,
        longitude: country.longitude ?? undefined,
      })
    } else {
      form.reset({
        name: '',
        iso2: '',
        iso3: '',
        numericCode: '',
        phonecode: '',
        capital: '',
        currency: '',
        currencyName: '',
        currencySymbol: '',
        native: '',
        subregion: '',
        regionId: '',
      })
    }
  }, [country, form, open])

  const mutation = useMutation({
    mutationFn: (values: CountryFormSchema) =>
      isEdit
        ? apiUpdateCountry({ id: country.id, data: values })
        : apiCreateCountry(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countries'] })
      queryClient.invalidateQueries({ queryKey: ['public-countries'] })
      toast.success(
        isEdit
          ? t('locations.country.updated', 'Country updated successfully')
          : t('locations.country.created', 'Country created successfully')
      )
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Something went wrong')
    },
  })

  const onSubmit = (values: CountryFormSchema) => {
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-162.5'>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('locations.country.editTitle', 'Edit Country')
              : t('locations.country.createTitle', 'Create Country')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'locations.country.dialogDesc',
              'Fill in the country details including codes, region, and currency.'
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem className='col-span-full'>
                    <FormLabel>
                      {t('locations.fields.name', 'Country Name')} *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder='e.g. Vietnam, France' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='iso2'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('locations.fields.iso2', 'ISO2 Code')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='VN, US, FR'
                        maxLength={2}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='iso3'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('locations.fields.iso3', 'ISO3 Code')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='VNM, USA, FRA'
                        maxLength={3}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='phonecode'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('locations.fields.phonecode', 'Phone Code')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='84, 1, 33'
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
                name='capital'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('locations.fields.capital', 'Capital City')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Hanoi, Washington, Paris'
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
                name='currency'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('locations.fields.currency', 'Currency Code')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='VND, USD, EUR'
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
                name='currencySymbol'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('locations.fields.currencySymbol', 'Currency Symbol')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='₫, $, €'
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
                name='regionId'
                render={({ field }) => (
                  <FormItem className='col-span-full'>
                    <FormLabel>
                      {t('locations.fields.region', 'Region')}
                    </FormLabel>
                    <FormControl>
                      <AutoCompleteSelectControl
                        {...field}
                        options={
                          regions?.map((r) => ({ id: r.id, name: r.name })) ||
                          []
                        }
                        isClearable
                        placeholder={t(
                          'locations.placeholders.selectRegion',
                          'Select a region'
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='native'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('locations.fields.native', 'Native Name')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Việt Nam'
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
                name='subregion'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('locations.fields.subregion', 'Subregion')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='South-Eastern Asia'
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
