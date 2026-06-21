import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeftIcon, SaveIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
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
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PasswordInput } from '@/components/password-input'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { apiCreateUser } from '../queries'
import { userCreateSchema, type UserCreateSchema } from '../schema'

export function PageUserCreate() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const form = useForm<UserCreateSchema>({
    defaultValues: {},
    resolver: zodResolver(userCreateSchema),
  })

  const createUserMutation = useMutation({
    mutationFn: apiCreateUser,
    onSuccess: () => {
      toast.success('User created successfully')
      navigate(-1)
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        toast.error(error?.response?.data?.message || 'Failed to create user')
      }
    },
  })

  const onSubmit = (values: UserCreateSchema) => {
    createUserMutation.mutate(values)
  }

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
            <div className='mb-2 flex flex-col items-baseline justify-between space-y-2 sm:flex-row sm:items-center'>
              <div className='flex flex-row space-x-2'>
                <h2 className='text-2xl font-bold tracking-tight'>
                  {t('users.create.title')}
                </h2>
              </div>
              <div className='flex w-full flex-wrap justify-end gap-2 sm:block sm:w-auto sm:justify-normal sm:space-x-2'>
                <Button
                  variant='outline'
                  type='button'
                  onClick={() => {
                    void navigate(-1)
                  }}
                >
                  <ArrowLeftIcon className='h-4 w-4' />
                  {t('buttons.cancel')}
                </Button>
                <Button type='submit'>
                  <SaveIcon className='h-4 w-4' />
                  {t('buttons.save')}
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle> {t('users.create.title')}</CardTitle>
                <CardDescription>
                  {t('users.create.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className='mt-4 flex flex-col gap-4 sm:gap-8 md:grid md:grid-cols-3'>
                <FormField
                  control={form.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>{t('users.create.email')}</FormLabel>
                      <FormControl>
                        <Input placeholder='test@example.com' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='firstName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        {t('users.create.firstName')}
                      </FormLabel>
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
                      <FormLabel required>
                        {t('users.create.lastName')}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder='Doe' {...field} />
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
                      <FormLabel required>
                        {t('users.create.password')}
                      </FormLabel>
                      <FormControl>
                        <PasswordInput placeholder='***********' {...field} />
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
                      <FormLabel required>
                        {t('users.create.confirmPassword')}
                      </FormLabel>
                      <FormControl>
                        <PasswordInput placeholder='***********' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className='mb-2 flex flex-col items-baseline justify-between space-y-2 sm:flex-row sm:items-center'>
              <div className='flex flex-row space-x-2'></div>
              <div className='flex w-full flex-wrap justify-end gap-2 sm:block sm:w-auto sm:justify-normal sm:space-x-2'>
                <Button
                  variant='outline'
                  type='button'
                  onClick={() => {
                    void navigate(-1)
                  }}
                >
                  <ArrowLeftIcon className='h-4 w-4' />
                  {t('buttons.cancel')}
                </Button>
                <Button type='submit'>
                  <SaveIcon className='h-4 w-4' />
                  {t('buttons.save')}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </Main>
    </>
  )
}
