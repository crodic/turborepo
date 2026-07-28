import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import TiptapEditor from '@/components/editor/tiptap-editor'
import AsyncCreatableSelect, {
  type Option,
} from '@/components/forms/async-paginate-creatable'
import { extensions } from './email-extensions'
import { apiSearchEmailRecipients } from './queries'
import {
  emailFormSchema,
  type EmailFormSchema,
  type EmailLogSchema,
} from './schema'

type Props = {
  email?: EmailLogSchema | null
  isPending?: boolean
  onSubmit: (data: EmailFormSchema) => void
  onCancel: () => void
}

const emptyForm: EmailFormSchema = {
  to: '',
  cc: '',
  bcc: '',
  subject: '',
  body: '',
  scheduledAt: '',
  sendToAllUsers: false,
  sendToAllAdmins: false,
}

type RecipientOption = Option & {
  data?: {
    email?: string
    type?: string
  }
}

function getInitialForm(email?: EmailLogSchema | null): EmailFormSchema {
  return email
    ? {
        to: email.to.join(', '),
        cc: email.cc?.join(', ') ?? '',
        bcc: email.bcc?.join(', ') ?? '',
        subject: email.subject,
        body: email.body ?? '',
        scheduledAt: email.scheduledAt ? email.scheduledAt.slice(0, 16) : '',
        sendToAllUsers: false,
        sendToAllAdmins: false,
      }
    : emptyForm
}

function emailsToOptions(value?: string | null): RecipientOption[] {
  if (!value) return []

  return value
    .split(/[\n,;]/)
    .map((email) => email.trim())
    .filter(Boolean)
    .map((email) => ({
      id: email,
      name: email,
      data: { email, type: 'manual' },
    }))
}

function optionToEmail(option: RecipientOption): string {
  return option.data?.email || String(option.id)
}

function optionsToValue(options: readonly RecipientOption[]): string {
  return [
    ...new Set(
      options
        .map(optionToEmail)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    ),
  ].join(', ')
}

async function loadRecipientOptions(search: string) {
  const recipients = await apiSearchEmailRecipients(search)
  const uniqueRecipients = [
    ...new Map(
      recipients.map((recipient) => [
        recipient.email.toLowerCase(),
        { ...recipient, email: recipient.email.toLowerCase() },
      ])
    ).values(),
  ]

  return {
    options: uniqueRecipients.map((recipient) => ({
      id: `${recipient.type}:${recipient.id}`,
      name: `${recipient.name} <${recipient.email}>`,
      data: {
        email: recipient.email,
        type: recipient.type,
      },
    })),
    hasMore: false,
  }
}

function RecipientSelect({
  value,
  placeholder,
  onChange,
  onBlur,
  disabled,
}: {
  value?: string
  placeholder?: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
}) {
  return (
    <AsyncCreatableSelect
      isMulti
      isDisabled={disabled}
      debounceTimeout={300}
      loadOptions={loadRecipientOptions}
      value={emailsToOptions(value)}
      placeholder={placeholder ?? 'Search admin/user or type an email'}
      getNewOptionData={(inputValue) => ({
        id: inputValue,
        name: inputValue,
        data: { email: inputValue, type: 'manual' },
      })}
      formatCreateLabel={(inputValue) => `Use "${inputValue}"`}
      onBlur={onBlur}
      onChange={(options) =>
        onChange(optionsToValue((options ?? []) as RecipientOption[]))
      }
    />
  )
}

export function EmailForm({ email, isPending, onSubmit, onCancel }: Props) {
  const form = useForm<EmailFormSchema>({
    resolver: zodResolver(emailFormSchema as any),
    defaultValues: getInitialForm(email),
  })

  const sendToAllUsers = form.watch('sendToAllUsers')
  const sendToAllAdmins = form.watch('sendToAllAdmins')
  const isSendAll = sendToAllUsers || sendToAllAdmins

  return (
    <Form {...form}>
      <form
        className='space-y-4'
        onSubmit={form.handleSubmit((values) => onSubmit(values as any))}
      >
        <div className='grid gap-4'>
          <div className='mb-2 flex items-center gap-4'>
            <FormField
              control={form.control as any}
              name='sendToAllUsers'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center space-y-0 space-x-2'>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormLabel className='font-normal'>
                    Send to all Users
                  </FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control as any}
              name='sendToAllAdmins'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center space-y-0 space-x-2'>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormLabel className='font-normal'>
                    Send to all Admins
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control as any}
            name='to'
            render={({ field }) => (
              <FormItem>
                <FormLabel required={!isSendAll}>To</FormLabel>
                <RecipientSelect
                  value={field.value}
                  placeholder={
                    isSendAll
                      ? 'System will automatically populate recipients in BCC...'
                      : 'Search admin/user or type recipient@example.com'
                  }
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={isPending || isSendAll}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='grid gap-4 md:grid-cols-2'>
            <FormField
              control={form.control as any}
              name='cc'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cc</FormLabel>
                  <RecipientSelect
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isPending}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control as any}
              name='bcc'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bcc</FormLabel>
                  <RecipientSelect
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isPending}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control as any}
            name='subject'
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Subject</FormLabel>
                <Input disabled={isPending} {...field} />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control as any}
            name='scheduledAt'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Schedule at</FormLabel>
                <Input type='datetime-local' disabled={isPending} {...field} />
                <FormDescription className='text-xs'>
                  Leave empty to send immediately.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control as any}
            name='body'
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Body</FormLabel>
                <TiptapEditor
                  output='html'
                  extensions={extensions}
                  content={field.value}
                  disabled={!!isPending}
                  onChangeContent={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='mt-6 flex items-center justify-end space-x-2'>
          <Button variant='outline' type='button' onClick={onCancel}>
            Cancel
          </Button>
          <Button type='submit' disabled={isPending}>
            {isPending ? 'Saving...' : email ? 'Save changes' : 'Send email'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
