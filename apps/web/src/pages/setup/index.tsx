import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { AuthLayout } from '../auth/auth-layout'
import { useSystemSetupMutation } from './queries'
import { systemSetupSchema, type SystemSetupSchema } from './schema'

export function PageSystemSetup() {
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
      toast.success('System setup completed successfully!')
      // Redirect to sign-in page, the guard will allow it now
      window.location.assign('/sign-in')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to setup system')
    }
  }

  return (
    <AuthLayout>
      <Card className='w-full max-w-lg gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            Welcome to the Setup Wizard
          </CardTitle>
          <CardDescription>
            Let's configure your website and create the first administrator
            account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              {/* Website Settings Section */}
              <div className='space-y-4 rounded-md border p-4'>
                <h3 className='leading-none font-medium'>Website Details</h3>
                <FormField
                  control={form.control}
                  name='site_brand'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website Name</FormLabel>
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
                  Administrator Account
                </h3>
                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='firstName'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
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
                        <FormLabel>Last Name</FormLabel>
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
                      <FormLabel>Email</FormLabel>
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
                      <FormLabel>Password</FormLabel>
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
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder='********' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type='submit' className='w-full' disabled={isPending}>
                {isPending ? 'Setting up...' : 'Complete Setup'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
