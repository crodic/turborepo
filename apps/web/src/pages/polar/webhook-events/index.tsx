import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import {
  Activity,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useDataPolarWebhookEvents } from '../queries'
import { WebhookEventDetailSheet } from './components/webhook-event-detail-sheet'

export function PagePolarWebhookEvents() {
  const [page, setPage] = useState(1)
  const [perPage] = useState(15)
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'processed' | 'pending' | 'failed'
  >('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const queryParams = useMemo(() => {
    const params: any = {
      page,
      limit: perPage,
    }
    if (statusFilter !== 'all') {
      params['filter.status'] = `$eq:${statusFilter}`
    }
    if (searchTerm) {
      params['search'] = searchTerm
    }
    return params
  }, [page, perPage, statusFilter, searchTerm])

  const { data, isLoading, isFetching, refetch } =
    useDataPolarWebhookEvents(queryParams)

  const events = data?.data ?? []
  const meta = data?.meta ?? { totalPages: 1, totalItems: 0 }

  const handleCopy = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopiedId(key)
    toast.success('Copied Event ID!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleOpenDetail = (event: any) => {
    setSelectedEvent(event)
    setSheetOpen(true)
  }

  const renderStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'processed':
        return (
          <Badge className='border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
            <CheckCircle2 className='mr-1 h-3 w-3' />
            Processed
          </Badge>
        )
      case 'failed':
        return (
          <Badge className='border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400'>
            <AlertCircle className='mr-1 h-3 w-3' />
            Failed
          </Badge>
        )
      default:
        return (
          <Badge className='border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'>
            <Clock className='mr-1 h-3 w-3' />
            Pending
          </Badge>
        )
    }
  }

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-2'>
          <Activity className='text-primary h-5 w-5' />
          <h1 className='text-lg font-semibold tracking-tight'>
            Webhook Events
          </h1>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6 p-6'>
        {/* Top Filter and Actions */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-xl font-bold tracking-tight'>
              Polar Webhook Events
            </h2>
            <p className='text-muted-foreground text-sm'>
              Tracked real-time asynchronous webhook calls from Polar gateway
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='relative w-full max-w-sm'>
            <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
            <Input
              placeholder='Search event ID or event type...'
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              className='pl-9'
            />
          </div>

          <div className='flex items-center gap-1.5'>
            {(['all', 'processed', 'pending', 'failed'] as const).map(
              (status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => {
                    setStatusFilter(status)
                    setPage(1)
                  }}
                  className='capitalize'
                >
                  {status}
                </Button>
              )
            )}
          </div>
        </div>

        {/* Events Table */}
        <div className='bg-card rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-[80px]'>#ID</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Polar Event ID</TableHead>
                <TableHead className='w-[130px]'>Status</TableHead>
                <TableHead className='w-[180px]'>Received At</TableHead>
                <TableHead className='w-[100px] text-right'>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className='text-muted-foreground h-32 text-center'
                  >
                    <RefreshCw className='mx-auto mb-2 h-6 w-6 animate-spin' />
                    Loading webhook events...
                  </TableCell>
                </TableRow>
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className='text-muted-foreground h-32 text-center'
                  >
                    No webhook events recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                events.map((evt: any) => (
                  <TableRow
                    key={evt.id}
                    className='hover:bg-muted/50 cursor-pointer'
                    onClick={() => handleOpenDetail(evt)}
                  >
                    <TableCell className='text-muted-foreground font-mono text-xs font-semibold'>
                      #{evt.id}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className='font-mono text-xs font-normal'
                      >
                        {evt.eventType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1.5'>
                        <span className='text-muted-foreground max-w-[200px] truncate font-mono text-xs'>
                          {evt.eventId}
                        </span>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-6 w-6'
                          onClick={(e) =>
                            handleCopy(e, evt.eventId, String(evt.id))
                          }
                        >
                          {copiedId === String(evt.id) ? (
                            <Check className='h-3 w-3 text-emerald-500' />
                          ) : (
                            <Copy className='h-3 w-3' />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{renderStatusBadge(evt.status)}</TableCell>
                    <TableCell className='text-muted-foreground text-xs'>
                      {evt.createdAt
                        ? format(
                            new Date(evt.createdAt),
                            'MMM dd, yyyy HH:mm:ss'
                          )
                        : 'N/A'}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenDetail(evt)
                        }}
                      >
                        <Eye className='mr-1 h-3.5 w-3.5' />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className='text-muted-foreground flex items-center justify-between border-t p-4 text-xs'>
              <span>
                Showing page {page} of {meta.totalPages} ({meta.totalItems}{' '}
                total events)
              </span>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className='h-4 w-4' />
                  Previous
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    setPage((p) => Math.min(meta.totalPages, p + 1))
                  }
                  disabled={page >= meta.totalPages}
                >
                  Next
                  <ChevronRight className='h-4 w-4' />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Webhook Event Detail Sheet */}
        <WebhookEventDetailSheet
          event={selectedEvent}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      </Main>
    </>
  )
}
