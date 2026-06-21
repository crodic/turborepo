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
import { Textarea } from '@/components/ui/textarea'
import AvatarUploader from '@/components/forms/avatar-uploader'
import { type AdminSchema } from '@/pages/admins/schema'
import { apiUpdateMe } from '@/pages/auth/queries'
import { profileFormSchema, type ProfileFormSchema } from '../schema'

export function ProfileForm({ user }: { user: AdminSchema }) {
  const { t } = useTranslation()
  const form = useForm<ProfileFormSchema>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { bio: user?.bio, avatar: undefined },
    mode: 'onChange',
  })
  const queryClient = useQueryClient()

  const updateMeMutation = useMutation({
    mutationFn: apiUpdateMe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authenticated_user'] })
      toast.success('Profile updated successfully')
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        toast.error(error?.response?.data?.message || 'Failed to update admin')
      }
    },
  })

  const onSubmit = (values: ProfileFormSchema) => {
    if (values.avatar === null) {
      values.removeAvatar = true
    }
    updateMeMutation.mutate(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <FormField
          control={form.control}
          name='avatar'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.profile.avatar')}</FormLabel>
              <FormControl>
                <AvatarUploader
                  viewportWidth={100}
                  viewportHeight={100}
                  field={field}
                  aspect={1}
                  cropShape='round'
                  defaultUri={user?.avatar ?? undefined}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='bio'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.profile.bio')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('settings.profile.bioPlaceholder')}
                  className='resize-none'
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>
                {t('settings.profile.messageBioDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit'>{t('settings.profile.buttonUpdate')}</Button>
      </form>
    </Form>
  )
}
