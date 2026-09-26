import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useMutationCreateCustomField } from '../queries'
import {
  createCustomFieldSchema,
  type CreateCustomFieldSchema,
} from '../schema'

interface CustomFieldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomFieldDialog({
  open,
  onOpenChange,
}: CustomFieldDialogProps) {
  const createMutation = useMutationCreateCustomField()

  const form = useForm<CreateCustomFieldSchema>({
    resolver: zodResolver(createCustomFieldSchema),
    defaultValues: {
      slug: '',
      name: '',
      type: 'text',
      required: false,
    },
  })

  const onSubmit = (values: CreateCustomFieldSchema) => {
    const sanitizedSlug = values.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    createMutation.mutate(
      {
        slug: sanitizedSlug,
        name: values.name.trim(),
        type: values.type,
        required: values.required,
        properties: {
          form_label: values.name.trim(),
          formLabel: values.name.trim(),
        },
      },
      {
        onSuccess: () => {
          form.reset()
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Create Custom Checkout Field</DialogTitle>
          <DialogDescription>
            Attach custom fields (e.g. VAT ID, GitHub Username, Team Name) to be
            collected from customers during checkout.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Label</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g. Company Tax ID'
                      {...field}
                      onChange={(e) => {
                        field.onChange(e)
                        const currentSlug = form.getValues('slug')
                        const isSlugDirty = form.getFieldState('slug').isDirty
                        if (!currentSlug || !isSlugDirty) {
                          const autoSlug = e.target.value
                            .toLowerCase()
                            .trim()
                            .replace(/[^a-z0-9-]/g, '-')
                            .replace(/-+/g, '-')
                          form.setValue('slug', autoSlug)
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='slug'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug Identifier</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g. tax-id'
                      className='font-mono'
                      {...field}
                      onChange={(e) => {
                        const val = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, '-')
                        field.onChange(val)
                      }}
                    />
                  </FormControl>
                  <FormDescription className='text-xs'>
                    Lowercase letters, numbers, and hyphens only (e.g. vat-id).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select field type' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='text'>Text</SelectItem>
                      <SelectItem value='number'>Number</SelectItem>
                      <SelectItem value='date'>Date</SelectItem>
                      <SelectItem value='checkbox'>
                        Checkbox (Boolean)
                      </SelectItem>
                      <SelectItem value='select'>Select (Dropdown)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='required'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs'>
                  <div className='space-y-0.5'>
                    <FormLabel>Required Field</FormLabel>
                    <FormDescription className='text-xs'>
                      Must be filled by the customer before checkout completion.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className='mr-2 size-4 animate-spin' />
                )}
                Create Field
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
