import { useState } from 'react'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Activity,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Code2,
  Mail,
  Receipt,
  Layers,
  Sparkles,
  ShieldCheck,
  Terminal,
  Copy,
  Check,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import DataLoader from '@/components/layout/data-loader'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useDataPolarWebhookEvent } from '../queries'

export function PagePolarWebhookEventDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const { data: event, isLoading } = useDataPolarWebhookEvent(id)

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'processed':
        return (
          <Badge className='border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400'>
            <CheckCircle2 className='mr-1.5 h-3.5 w-3.5' />
            Processed
          </Badge>
        )
      case 'failed':
        return (
          <Badge className='border-rose-500/30 bg-rose-500/15 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-400'>
            <AlertCircle className='mr-1.5 h-3.5 w-3.5' />
            Failed
          </Badge>
        )
      default:
        return (
          <Badge className='border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400'>
            <Clock className='mr-1.5 h-3.5 w-3.5' />
            Pending
          </Badge>
        )
    }
  }

  if (isLoading) return <DataLoader />
  if (!event) {
    return (
      <Main className='flex h-[70vh] flex-col items-center justify-center space-y-4'>
        <p className='text-muted-foreground text-sm'>
          Webhook event not found.
        </p>
        <Button
          variant='outline'
          onClick={() => navigate('/polar/webhook-events')}
        >
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back to Webhook Events
        </Button>
      </Main>
    )
  }

  const payloadData = event.payload?.data || event.payload || {}
  const customerEmail =
    payloadData.customer?.email ||
    payloadData.customer_email ||
    payloadData.user?.email ||
    payloadData.email ||
    payloadData.metadata?.customerEmail ||
    null

  const customerName =
    payloadData.customer?.name ||
    payloadData.customer_name ||
    payloadData.user?.public_name ||
    null

  const targetId = payloadData.id || payloadData.order_id || null

  const rawAmount =
    payloadData.amount ??
    payloadData.total_amount ??
    payloadData.items?.[0]?.amount ??
    null

  const currency = (payloadData.currency || 'usd').toUpperCase()

  const formattedAmount =
    rawAmount !== null && rawAmount !== undefined
      ? currency === 'VND'
        ? new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
          }).format(rawAmount)
        : new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
          }).format(rawAmount / 100)
      : null

  const itemLabel =
    payloadData.items?.[0]?.label ||
    payloadData.product?.name ||
    payloadData.description ||
    null

  const payloadString = event.payload
    ? JSON.stringify(event.payload, null, 2)
    : '{}'

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={() => navigate('/polar/webhook-events')}
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div className='flex items-center gap-2'>
            <Activity className='text-primary h-5 w-5' />
            <h1 className='text-lg font-semibold tracking-tight'>
              Webhook Event #{event.id}
            </h1>
          </div>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='mx-auto max-w-5xl space-y-6 p-6 pb-16'>
        {/* Hero Card */}
        <div className='from-muted/60 via-muted/20 to-background rounded-2xl border bg-gradient-to-b p-6 shadow-sm'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-start gap-4'>
              <div className='bg-primary/10 text-primary ring-primary/20 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1'>
                <Activity className='h-7 w-7' />
              </div>
              <div className='space-y-1.5'>
                <div className='flex flex-wrap items-center gap-3'>
                  <h2 className='text-foreground text-2xl font-bold tracking-tight'>
                    Webhook Event #{event.id}
                  </h2>
                  {getStatusBadge(event.status)}
                </div>
                <p className='text-muted-foreground text-xs'>
                  Received from Polar Webhook Dispatcher
                </p>
                <div className='flex flex-wrap items-center gap-2 pt-1'>
                  <Badge
                    variant='outline'
                    className='bg-background font-mono text-xs'
                  >
                    {event.eventType}
                  </Badge>
                  <span className='bg-muted/50 text-muted-foreground flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs'>
                    <Calendar className='h-3.5 w-3.5' />
                    {event.createdAt
                      ? format(
                          new Date(event.createdAt),
                          'MMM dd, yyyy HH:mm:ss'
                        )
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant='outline'
              onClick={() => handleCopy(payloadString, 'payload-hero')}
            >
              {copiedKey === 'payload-hero' ? (
                <>
                  <Check className='mr-1.5 h-4 w-4 text-emerald-500' />
                  Copied JSON
                </>
              ) : (
                <>
                  <Code2 className='mr-1.5 h-4 w-4' />
                  Copy Payload
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Failure alert if failed */}
        {event.status === 'failed' && event.errorMessage && (
          <div className='rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-700 shadow-sm dark:text-rose-300'>
            <div className='flex items-start gap-3'>
              <AlertCircle className='mt-0.5 h-5 w-5 shrink-0 text-rose-500' />
              <div className='space-y-1'>
                <p className='text-sm font-semibold'>Processing Failure</p>
                <p className='font-mono text-xs leading-relaxed'>
                  {event.errorMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Extracted Context */}
        {(customerEmail || targetId || formattedAmount || itemLabel) && (
          <div className='bg-card/60 space-y-4 rounded-2xl border p-6 shadow-sm backdrop-blur-xs'>
            <div className='text-muted-foreground flex items-center gap-2 text-xs font-bold tracking-wider uppercase'>
              <Sparkles className='text-primary h-4 w-4' />
              Extracted Event Context
            </div>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4'>
              {customerEmail && (
                <div className='bg-muted/40 space-y-1.5 rounded-xl border p-4'>
                  <span className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
                    <Mail className='text-primary/70 h-3.5 w-3.5' />
                    Customer
                  </span>
                  <p className='text-foreground truncate text-xs font-semibold'>
                    {customerEmail}
                  </p>
                  {customerName && (
                    <p className='text-muted-foreground truncate text-[11px]'>
                      {customerName}
                    </p>
                  )}
                </div>
              )}

              {formattedAmount && (
                <div className='bg-muted/40 space-y-1.5 rounded-xl border p-4'>
                  <span className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
                    <Receipt className='h-3.5 w-3.5 text-emerald-500' />
                    Amount
                  </span>
                  <p className='text-sm font-bold text-emerald-600 dark:text-emerald-400'>
                    {formattedAmount}
                  </p>
                </div>
              )}

              {itemLabel && (
                <div className='bg-muted/40 space-y-1.5 rounded-xl border p-4'>
                  <span className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
                    <Layers className='text-primary/70 h-3.5 w-3.5' />
                    Item / Plan
                  </span>
                  <p className='text-foreground truncate text-xs font-medium'>
                    {itemLabel}
                  </p>
                </div>
              )}

              {targetId && (
                <div className='bg-muted/40 space-y-1.5 rounded-xl border p-4'>
                  <span className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
                    <ShieldCheck className='text-primary/70 h-3.5 w-3.5' />
                    Resource ID
                  </span>
                  <p className='text-muted-foreground truncate font-mono text-xs font-medium'>
                    {targetId}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Technical Meta Grid */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <div className='bg-muted/40 space-y-1.5 rounded-xl border p-4'>
            <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
              Event Type
            </span>
            <p className='text-foreground truncate font-mono text-sm font-semibold'>
              {event.eventType}
            </p>
          </div>
          <div className='bg-muted/40 space-y-1.5 rounded-xl border p-4'>
            <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
              Processed At
            </span>
            <p className='text-foreground truncate text-sm font-semibold'>
              {event.processedAt
                ? format(new Date(event.processedAt), 'MMM dd, yyyy HH:mm:ss')
                : 'Pending'}
            </p>
          </div>
        </div>

        {/* Polar Event ID Box */}
        <div className='bg-muted/40 flex items-center justify-between rounded-xl border p-4'>
          <div className='min-w-0 flex-1 space-y-1'>
            <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
              Polar Event ID
            </span>
            <p className='text-foreground truncate font-mono text-sm font-semibold'>
              {event.eventId}
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handleCopy(event.eventId, 'eventId')}
          >
            {copiedKey === 'eventId' ? (
              <>
                <Check className='mr-1.5 h-3.5 w-3.5 text-emerald-500' />
                Copied
              </>
            ) : (
              <>
                <Copy className='mr-1.5 h-3.5 w-3.5' />
                Copy ID
              </>
            )}
          </Button>
        </div>

        {/* Dark Terminal Payload View */}
        <div className='space-y-3 pt-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Terminal className='text-primary h-4 w-4' />
              <span className='text-foreground text-sm font-bold tracking-wider uppercase'>
                Full Raw Payload
              </span>
              <span className='text-muted-foreground text-xs'>
                ({payloadString.length} chars)
              </span>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => handleCopy(payloadString, 'payload')}
            >
              {copiedKey === 'payload' ? (
                <>
                  <Check className='mr-1.5 h-3.5 w-3.5 text-emerald-500' />
                  Copied JSON
                </>
              ) : (
                <>
                  <Copy className='mr-1.5 h-3.5 w-3.5' />
                  Copy JSON
                </>
              )}
            </Button>
          </div>

          <div className='overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-md'>
            <div className='flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/80 px-4 py-2.5 font-mono text-xs text-zinc-400'>
              <div className='flex items-center gap-2'>
                <div className='h-2.5 w-2.5 rounded-full bg-rose-500/80' />
                <div className='h-2.5 w-2.5 rounded-full bg-amber-500/80' />
                <div className='h-2.5 w-2.5 rounded-full bg-emerald-500/80' />
                <span className='ml-2 text-[11px] text-zinc-400'>
                  payload.json
                </span>
              </div>
              <span className='text-[11px] text-zinc-500'>UTF-8</span>
            </div>
            <pre className='max-h-[600px] overflow-auto p-5 font-mono text-xs leading-relaxed text-zinc-200'>
              {payloadString}
            </pre>
          </div>
        </div>
      </Main>
    </>
  )
}

export default PagePolarWebhookEventDetail
