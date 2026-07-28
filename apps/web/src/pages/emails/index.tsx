import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon } from 'lucide-react'
import {
  ClockIcon,
  CheckCircle2Icon,
  XCircleIcon,
  BanIcon,
  MailIcon,
  PencilIcon,
} from 'lucide-react'
import { parseAsArrayOf, parseAsString } from 'nuqs'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PaginateQueryBuilder } from '@/lib/query-builder'
import { sortParser } from '@/lib/utils'
import { useDataTable } from '@/hooks/use-data-table'
import useGetFilterParams from '@/hooks/use-get-filter-params'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ConfigDrawer } from '@/components/config-drawer'
import { DataTableSortList } from '@/components/data-table/data-table-sort-list'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { getEmailTableColumns } from './columns'
import { apiCancelEmail, useDataMyEmails } from './queries'
import { ColumnKey, type EmailLogSchema } from './schema'

const emailFilterParsers = {
  subject: parseAsString.withDefault(''),
  status: parseAsArrayOf(parseAsString, ',').withDefault([]),
} as const

export function PageMyEmails() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    page,
    perPage,
    sorting: sort,
    filter,
  } = useGetFilterParams<EmailLogSchema, typeof emailFilterParsers>({
    allowedSorts: [
      ColumnKey.createdAt,
      ColumnKey.scheduledAt,
      ColumnKey.sentAt,
      ColumnKey.status,
    ],
    filterParsers: emailFilterParsers,
  })

  const builder = new PaginateQueryBuilder()
    .page(page)
    .limit(perPage)
    .ilike('subject', filter.subject)
    .in('status', filter.status || [])
    .sortBy(sortParser(sort).sortBy, sortParser(sort).sortDirection)

  const { data, isFetching } = useDataMyEmails(builder.build())

  const invalidateEmails = () => {
    queryClient.invalidateQueries({ queryKey: ['my_emails'] })
    queryClient.invalidateQueries({ queryKey: ['email_logs'] })
  }

  const cancelMutation = useMutation({
    mutationFn: apiCancelEmail,
    onSuccess: () => {
      toast.success('Scheduled email cancelled')
      invalidateEmails()
    },
    onError: () => toast.error('Failed to cancel email'),
  })
  const { mutate: cancelEmail } = cancelMutation

  const columns = useMemo(
    () =>
      getEmailTableColumns({
        onEdit: (email) => {
          navigate(`/emails/${email.id}/edit`)
        },
        onCancel: (email) => cancelEmail(email.id),
      }),
    [cancelEmail, navigate]
  )
  const totalPages = data?.meta.totalPages ?? 0
  const { table } = useDataTable({
    data: data?.data ?? [],
    columns,
    pageCount: totalPages,
    initialState: {
      columnPinning: { right: ['actions'] },
      sorting: [{ id: ColumnKey.createdAt, desc: true }],
    },
    getRowId: (row) => row.id,
  })

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

      <Main fluid className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Email Campaigns
            </h2>
            <p className='text-muted-foreground'>
              Manage your messaging campaigns and scheduled announcements.
            </p>
          </div>
          <Button
            onClick={() => {
              navigate('/emails/create')
            }}
          >
            <PlusIcon className='me-2 size-4' />
            Create Campaign
          </Button>
        </div>

        <div className='flex items-center justify-between'>
          <DataTableToolbar table={table}>
            <DataTableSortList table={table} />
          </DataTableToolbar>
        </div>

        {isFetching ? (
          <div className='flex h-40 items-center justify-center'>
            <span className='text-muted-foreground animate-pulse'>
              Loading campaigns...
            </span>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {data?.data.map((email) => (
              <EmailCard
                key={email.id}
                email={email}
                onEdit={() => {
                  navigate(`/emails/${email.id}/edit`)
                }}
                onCancel={() => cancelEmail(email.id)}
                onClick={() => navigate(`/emails/${email.id}/show`)}
              />
            ))}
            {data?.data.length === 0 && (
              <div className='text-muted-foreground col-span-full rounded-lg border-2 border-dashed py-12 text-center'>
                No campaigns found.
              </div>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        <div className='flex items-center justify-end space-x-2 py-4'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <div className='text-muted-foreground text-sm'>
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </Main>
    </>
  )
}

function EmailCard({
  email,
  onEdit,
  onCancel,
  onClick,
}: {
  email: EmailLogSchema
  onEdit: () => void
  onCancel: () => void
  onClick: () => void
}) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'sent':
        return {
          color:
            'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
          icon: CheckCircle2Icon,
          label: 'Sent',
        }
      case 'scheduled':
        return {
          color:
            'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
          icon: ClockIcon,
          label: 'Scheduled',
        }
      case 'failed':
        return {
          color: 'bg-destructive/10 text-destructive',
          icon: XCircleIcon,
          label: 'Failed',
        }
      case 'cancelled':
        return {
          color: 'bg-muted text-muted-foreground',
          icon: BanIcon,
          label: 'Cancelled',
        }
      default:
        return {
          color: 'bg-secondary text-secondary-foreground',
          icon: MailIcon,
          label: status,
        }
    }
  }

  const cfg = getStatusConfig(email.status)
  const Icon = cfg.icon

  return (
    <Card
      className='group hover:border-primary/50 flex cursor-pointer flex-col transition-all duration-200 hover:shadow-md'
      onClick={onClick}
    >
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <Badge
            variant='outline'
            className={`mb-3 border-0 font-medium ${cfg.color}`}
          >
            <Icon className='mr-1.5 h-3.5 w-3.5' /> {cfg.label}
          </Badge>
          <div
            className='flex space-x-1 opacity-0 transition-opacity group-hover:opacity-100'
            onClick={(e) => e.stopPropagation()}
          >
            {email.status === 'scheduled' && (
              <>
                <Button
                  variant='ghost'
                  size='icon'
                  className='bg-background/50 h-7 w-7 shadow-sm backdrop-blur-sm'
                  onClick={onEdit}
                >
                  <PencilIcon className='h-3.5 w-3.5' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  className='bg-background/50 text-destructive hover:text-destructive h-7 w-7 shadow-sm backdrop-blur-sm'
                  onClick={onCancel}
                >
                  <BanIcon className='h-3.5 w-3.5' />
                </Button>
              </>
            )}
          </div>
        </div>
        <CardTitle
          className='line-clamp-2 text-lg leading-tight'
          title={email.subject}
        >
          {email.subject}
        </CardTitle>
        <CardDescription className='mt-2 line-clamp-1 text-xs'>
          To: {email.to?.join(', ') || 'System Default'}
        </CardDescription>
      </CardHeader>
      <CardContent className='flex-1 pt-0'>
        <div className='text-muted-foreground bg-secondary/30 mt-2 space-y-2 rounded-md p-3 text-xs'>
          <div className='flex items-center'>
            <MailIcon className='text-primary/70 mr-2 h-3.5 w-3.5' />
            <span className='font-medium'>
              {(email.to?.length || 0) +
                (email.cc?.length || 0) +
                (email.bcc?.length || 0)}{' '}
              Recipients
            </span>
          </div>
          <div className='flex items-center'>
            <ClockIcon className='text-primary/70 mr-2 h-3.5 w-3.5' />
            <span>
              {email.status === 'scheduled' && email.scheduledAt
                ? `Scheduled: ${new Date(email.scheduledAt).toLocaleString()}`
                : email.status === 'sent' && email.sentAt
                  ? `Sent: ${new Date(email.sentAt).toLocaleString()}`
                  : `Created: ${new Date(email.createdAt).toLocaleString()}`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
