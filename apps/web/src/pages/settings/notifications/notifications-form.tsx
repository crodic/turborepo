import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { type AdminSchema } from '@/pages/admins/schema'
import { apiUpdateNotificationSettings } from '@/pages/auth/queries'
import { notificationKeys } from '@/pages/notifications/queries'
import {
  notificationsFormSchema,
  type NotificationsFormSchema,
} from '../schema'

const defaultNotifications = {
  system: true,
  security: true,
  email: true,
}

export function NotificationsForm({ user }: { user: AdminSchema }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const form = useForm<NotificationsFormSchema>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: {
      notifications: {
        ...defaultNotifications,
        ...(user.notifications ?? {}),
      },
    },
  })

  const notificationOptions = [
    {
      name: 'system' as const,
      label: t('settings.notifications.systemLabel', {
        defaultValue: 'System notifications',
      }),
      description: t('settings.notifications.systemDesc', {
        defaultValue:
          'Receive product, admin panel, and future system events that are not part of another category.',
      }),
    },
    {
      name: 'security' as const,
      label: t('settings.notifications.securityLabel', {
        defaultValue: 'Security notifications',
      }),
      description: t('settings.notifications.securityDesc', {
        defaultValue:
          'Receive sign-in, password, two-factor authentication, and session activity updates.',
      }),
    },
    {
      name: 'email' as const,
      label: t('settings.notifications.emailLabel', {
        defaultValue: 'Email notifications',
      }),
      description: t('settings.notifications.emailDesc', {
        defaultValue:
          'Receive updates when emails are sent, fail to send, or are cancelled.',
      }),
    },
  ]

  const updateNotificationsMutation = useMutation({
    mutationFn: apiUpdateNotificationSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authenticated_user'] })
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      toast.success(t('settings.notifications.success'))
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        toast.error(
          error?.response?.data?.message ||
            t('settings.notifications.error', {
              defaultValue: 'Failed to update notification settings',
            })
        )
      }
    },
  })

  function onSubmit(data: NotificationsFormSchema) {
    updateNotificationsMutation.mutate(data)
  }

  return (
    <div className='space-y-6'>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
          <div className='space-y-4'>
            {notificationOptions.map((option) => (
              <FormField
                key={option.name}
                control={form.control}
                name={`notifications.${option.name}`}
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5 pr-6'>
                      <FormLabel className='text-base'>
                        {option.label}
                      </FormLabel>
                      <FormDescription>{option.description}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
          <Button
            type='submit'
            disabled={updateNotificationsMutation.isPending}
          >
            {t('settings.notifications.submit')}
          </Button>
        </form>
      </Form>
    </div>
  )
}
