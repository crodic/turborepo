import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
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
    <div className='flex-1'>
      <AsyncCreatableSelect
        isMulti
        isDisabled={disabled}
        debounceTimeout={300}
        loadOptions={loadRecipientOptions}
        value={emailsToOptions(value)}
        placeholder={placeholder ?? 'Recipients...'}
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
        styles={{
          control: (base) => ({
            ...base,
            border: 0,
            boxShadow: 'none',
            backgroundColor: 'transparent',
            paddingLeft: 0,
          }),
          valueContainer: (base) => ({
            ...base,
            paddingLeft: 0,
          }),
        }}
      />
    </div>
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
        className='flex h-full flex-col'
        onSubmit={form.handleSubmit((values) => onSubmit(values as any))}
      >
        <div className='flex flex-col'>
          <div className='flex items-center gap-6 border-b px-4 py-2 text-sm'>
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
                  <FormLabel className='text-muted-foreground cursor-pointer font-normal'>
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
                  <FormLabel className='text-muted-foreground cursor-pointer font-normal'>
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
              <FormItem className='flex items-center space-y-0 border-b px-4'>
                <FormLabel className='text-muted-foreground w-12 font-normal'>
                  To
                </FormLabel>
                <FormControl>
                  <RecipientSelect
                    value={field.value}
                    placeholder={
                      isSendAll
                        ? 'System will automatically populate recipients in BCC...'
                        : 'Recipients...'
                    }
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isPending || isSendAll}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {!isSendAll && (
            <div className='flex flex-col'>
              <FormField
                control={form.control as any}
                name='cc'
                render={({ field }) => (
                  <FormItem className='flex items-center space-y-0 border-b px-4'>
                    <FormLabel className='text-muted-foreground w-12 font-normal'>
                      Cc
                    </FormLabel>
                    <FormControl>
                      <RecipientSelect
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        disabled={isPending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name='bcc'
                render={({ field }) => (
                  <FormItem className='flex items-center space-y-0 border-b px-4'>
                    <FormLabel className='text-muted-foreground w-12 font-normal'>
                      Bcc
                    </FormLabel>
                    <FormControl>
                      <RecipientSelect
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        disabled={isPending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}

          <FormField
            control={form.control as any}
            name='subject'
            render={({ field }) => (
              <FormItem className='flex items-center space-y-0 border-b px-4'>
                <FormControl>
                  <Input
                    placeholder='Subject'
                    disabled={isPending}
                    {...field}
                    className='h-10 rounded-none border-0 px-0 font-semibold shadow-none focus-visible:ring-0'
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name='scheduledAt'
            render={({ field }) => (
              <FormItem className='flex items-center justify-between space-y-0 border-b px-4 py-1'>
                <FormLabel className='text-muted-foreground w-32 text-sm font-normal'>
                  Schedule time:
                </FormLabel>
                <div className='flex flex-1 justify-end'>
                  <FormControl>
                    <Input
                      type='datetime-local'
                      disabled={isPending}
                      {...field}
                      className='h-8 w-[220px] border-none shadow-none focus-visible:ring-0'
                    />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name='body'
            render={({ field }) => (
              <FormItem className='flex min-h-[300px] flex-1 flex-col space-y-0'>
                <FormControl>
                  <div className='flex-1 [&_.border]:border-0 [&_.border-b]:border-b [&_.tiptap]:min-h-[250px] [&_.tiptap]:p-4'>
                    <TiptapEditor
                      output='html'
                      extensions={extensions}
                      content={field.value}
                      disabled={!!isPending}
                      onChangeContent={field.onChange}
                    />
                  </div>
                </FormControl>
                <FormMessage className='px-4 pb-2' />
              </FormItem>
            )}
          />
        </div>

        <div className='bg-muted/20 mt-auto flex items-center justify-between border-t p-4'>
          <Button
            variant='ghost'
            type='button'
            onClick={onCancel}
            className='text-muted-foreground hover:text-foreground'
          >
            Discard
          </Button>
          <Button
            type='submit'
            disabled={isPending}
            className='rounded-full px-6 font-semibold'
          >
            {isPending ? 'Sending...' : email ? 'Save Changes' : 'Send'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
