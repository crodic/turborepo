import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { SendIcon } from 'lucide-react'
import { parseAsArrayOf, parseAsString } from 'nuqs'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PaginateQueryBuilder } from '@/lib/query-builder'
import { sortParser } from '@/lib/utils'
import { useDataTable } from '@/hooks/use-data-table'
import useGetFilterParams from '@/hooks/use-get-filter-params'
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
import { Textarea } from '@/components/ui/textarea'
import { ConfigDrawer } from '@/components/config-drawer'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableSortList } from '@/components/data-table/data-table-sort-list'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useDataAdminOverview } from '../admins/queries'
import { type AdminSchema, ColumnKey } from '../admins/schema'
import { getSendNotificationColumns } from './columns'
import { sendNotification, useOnlineAdmins } from './queries'
import { sendNotificationSchema, type SendNotificationSchema } from './schema'

const adminsFilterParsers = {
  email: parseAsString,
  fullName: parseAsString,
  role: parseAsArrayOf(parseAsString, ','),
} as const

export function PageSendNotifications() {
  const { t } = useTranslation()

  // Data table state for admins
  const {
    page,
    perPage,
    sorting: sort,
    filter,
  } = useGetFilterParams<AdminSchema, typeof adminsFilterParsers>({
    allowedSorts: [ColumnKey.email, ColumnKey.fullName],
    filterParsers: adminsFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('email', filter.email)
    .ilike('fullName', filter.fullName)
    .in('roles.id', filter.role || [])
    .sortBy(sortParser(sort).sortBy, sortParser(sort).sortDirection)

  const { data: adminsData, isFetching: isFetchingAdmins } =
    useDataAdminOverview(builder.build())
  const { data: onlineAdminIds = [] } = useOnlineAdmins()

  const columns = useMemo(
    () => getSendNotificationColumns({ onlineAdminIds }),
    [onlineAdminIds]
  )

  const totalPages = adminsData?.meta.totalPages ?? 0

  const { table } = useDataTable({
    data: adminsData?.data ?? [],
    columns: columns,
    pageCount: totalPages,
    getRowId: (row) => row.id,
  })

  // Form state
  const form = useForm<SendNotificationSchema>({
    resolver: zodResolver(sendNotificationSchema),
    defaultValues: {
      title: '',
      message: '',
      targetAdminIds: [],
    },
  })

  const sendMutation = useMutation({
    mutationFn: sendNotification,
    onSuccess: () => {
      toast.success('Notification sent successfully!')
      form.reset()
      table.resetRowSelection()
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Failed to send notification'
      )
    },
  })

  const onSubmit = (values: SendNotificationSchema) => {
    // Get selected admin IDs from the table
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const selectedIds = selectedRows.map((row) => Number(row.original.id))

    sendMutation.mutate({
      ...values,
      targetAdminIds: selectedIds,
    })
  }

  const selectedCount = table.getFilteredSelectedRowModel().rows.length

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            Send Notifications
          </h2>
          <p className='text-muted-foreground'>
            Send real-time alerts or messages to other administrators.
          </p>
        </div>

        <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
          {/* Form Section */}
          <div className='lg:col-span-1'>
            <Card>
              <CardHeader>
                <CardTitle>Compose Message</CardTitle>
                <CardDescription>
                  Draft your notification. Leave recipient selection empty to
                  send to all admins.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className='space-y-4'
                  >
                    <FormField
                      control={form.control}
                      name='title'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='Notification title...'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='message'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder='Type your message here...'
                              className='min-h-[120px]'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type='submit'
                      className='w-full'
                      disabled={sendMutation.isPending}
                    >
                      <SendIcon className='mr-2 h-4 w-4' />
                      {selectedCount > 0
                        ? `Send to ${selectedCount} Admin${selectedCount > 1 ? 's' : ''}`
                        : 'Send to All Admins'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Admin Selection Section */}
          <div className='flex flex-col gap-4 lg:col-span-2'>
            <Card className='flex flex-1 flex-col overflow-hidden'>
              <CardHeader className='pb-2'>
                <CardTitle>Select Recipients</CardTitle>
                <CardDescription>
                  Choose specific administrators to receive this notification,
                  or select none to broadcast to everyone.
                </CardDescription>
              </CardHeader>
              <CardContent className='flex-1 overflow-auto'>
                <DataTable table={table} isFetching={isFetchingAdmins}>
                  <DataTableToolbar table={table}>
                    <DataTableSortList table={table} />
                  </DataTableToolbar>
                </DataTable>
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>
    </>
  )
}
