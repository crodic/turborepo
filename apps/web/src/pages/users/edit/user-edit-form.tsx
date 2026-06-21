import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Main } from '@/components/layout/main'
import { apiEditUser } from '../queries'
import { type UserEditSchema, userEditSchema, type UserSchema } from '../schema'

export function UserEditForm({ data }: { data: UserSchema }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const form = useForm<UserEditSchema>({
    defaultValues: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName ?? undefined,
    },
    resolver: zodResolver(userEditSchema),
  })

  const editUserMutation = useMutation({
    mutationFn: apiEditUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
      toast.success('User updated successfully')
      navigate(-1)
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        toast.error(error?.response?.data?.message || 'Failed to update user')
      }
    },
  })

  const onSubmit = (values: UserEditSchema) => {
    if (data.id) {
      editUserMutation.mutate({ id: data.id, data: values })
    }
  }

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
          <div className='mb-2 flex flex-col items-baseline justify-between space-y-2 sm:flex-row sm:items-center'>
            <div className='flex flex-row space-x-2'>
              <h2 className='text-2xl font-bold tracking-tight'>
                {t('users.edit.title')}
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
              <CardTitle>{t('users.edit.title')}</CardTitle>
              <CardDescription>{t('users.edit.description')}</CardDescription>
            </CardHeader>
            <CardContent className='mt-4 flex flex-col gap-4 sm:gap-8 md:grid md:grid-cols-3'>
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t('users.edit.email')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='test@example.com'
                        {...field}
                        disabled
                      />
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
                    <FormLabel required>{t('users.edit.firstName')}</FormLabel>
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
                    <FormLabel required>{t('users.edit.lastName')}</FormLabel>
                    <FormControl>
                      <Input placeholder='Doe' {...field} />
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
  )
}
