import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { RuntimeLogo } from '@/components/runtime-logo'
import { useSystemSetupMutation } from './queries'
import { systemSetupSchema, type SystemSetupSchema } from './schema'

export function PageSystemSetup() {
  const { t } = useTranslation()
  const { mutateAsync: setupSystem, isPending } = useSystemSetupMutation()

  const form = useForm<SystemSetupSchema>({
    resolver: zodResolver(systemSetupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      site_brand: '',
    },
  })

  const onSubmit = async (data: SystemSetupSchema) => {
    try {
      await setupSystem(data)
      toast.success(t('setup.completeSuccess'))
      // Redirect to sign-in page, the guard will allow it now
      window.location.assign('/sign-in')
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          t('setup.failed', { defaultValue: 'Failed to setup system' })
      )
    }
  }

  return (
    <div className='container grid h-svh max-w-none items-center justify-center'>
      <div className='mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:w-150 sm:p-8'>
        <div className='mb-4 flex flex-col items-center justify-center'>
          <RuntimeLogo
            className='max-h-24 w-36'
            placeholderClassName='h-24 w-36'
          />
        </div>
        <Card className='mx-auto w-full max-w-full gap-4'>
          <CardHeader>
            <CardTitle className='text-lg tracking-tight'>
              {t('setup.title')}
            </CardTitle>
            <CardDescription>{t('setup.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className='space-y-6'
              >
                {/* Website Settings Section */}
                <div className='space-y-4 rounded-md border p-4'>
                  <h3 className='leading-none font-medium'>
                    {t('setup.websiteDetails')}
                  </h3>
                  <FormField
                    control={form.control}
                    name='site_brand'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('setup.websiteName')}</FormLabel>
                        <FormControl>
                          <Input placeholder='My Awesome Site' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Account Settings Section */}
                <div className='space-y-4 rounded-md border p-4'>
                  <h3 className='leading-none font-medium'>
                    {t('setup.adminAccount')}
                  </h3>
                  <div className='grid grid-cols-2 gap-4'>
                    <FormField
                      control={form.control}
                      name='firstName'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('setup.firstName')}</FormLabel>
                          <FormControl>
                            <Input placeholder='John' {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='lastName'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('setup.lastName')}</FormLabel>
                          <FormControl>
                            <Input placeholder='Doe' {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name='email'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('setup.email')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='admin@example.com'
                            type='email'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='password'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('setup.password')}</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder='********' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='confirmPassword'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('setup.confirmPassword')}</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder='********' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type='submit' className='w-full' disabled={isPending}>
                  {isPending
                    ? t('setup.settingUp', { defaultValue: 'Setting up...' })
                    : t('setup.completeButton', {
                        defaultValue: 'Complete Setup',
                      })}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
