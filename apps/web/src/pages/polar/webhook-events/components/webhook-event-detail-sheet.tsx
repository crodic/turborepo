import { useState } from 'react'
import { format } from 'date-fns'
import {
  Copy,
  Check,
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
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface WebhookEventDetailSheetProps {
  event: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WebhookEventDetailSheet({
  event,
  open,
  onOpenChange,
}: WebhookEventDetailSheetProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  if (!event) return null

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

  // Extract key summary insights from payload if possible
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full gap-0 overflow-y-auto p-0 sm:max-w-xl md:max-w-2xl'>
        {/* Header Hero Banner with generous padding & safe clearance for close button */}
        <div className='from-muted/60 via-muted/20 to-background border-b bg-gradient-to-b px-6 py-6 pr-16'>
          <SheetHeader className='space-y-4 p-0'>
            <div className='flex items-start gap-4'>
              <div className='bg-primary/10 text-primary ring-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1'>
                <Activity className='h-6 w-6' />
              </div>
              <div className='min-w-0 flex-1 space-y-1.5'>
                <div className='flex flex-wrap items-center gap-2.5'>
                  <SheetTitle className='text-foreground text-xl font-bold tracking-tight'>
                    Webhook Event #{event.id}
                  </SheetTitle>
                  {getStatusBadge(event.status)}
                </div>
                <SheetDescription className='text-muted-foreground text-xs leading-normal'>
                  Received from Polar Webhook Dispatcher
                </SheetDescription>
              </div>
            </div>

            {/* Sub-meta tags */}
            <div className='flex flex-wrap items-center gap-2 pt-1'>
              <Badge
                variant='outline'
                className='bg-background px-2.5 py-1 font-mono text-xs font-semibold shadow-xs'
              >
                {event.eventType}
              </Badge>
              <span className='text-muted-foreground bg-muted/50 flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs'>
                <Calendar className='h-3.5 w-3.5' />
                {event.createdAt
                  ? format(new Date(event.createdAt), 'MMM dd, yyyy HH:mm:ss')
                  : 'N/A'}
              </span>
            </div>
          </SheetHeader>
        </div>

        {/* Content Body with generous p-6 space-y-6 padding */}
        <div className='space-y-6 p-6 pb-12'>
          {/* Failure Alert Banner (if failed) */}
          {event.status === 'failed' && event.errorMessage && (
            <div className='rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-700 shadow-sm dark:text-rose-300'>
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

          {/* Quick Payload Insight Summary Card */}
          {(customerEmail || targetId || formattedAmount || itemLabel) && (
            <div className='bg-card/60 space-y-3.5 rounded-2xl border p-5 shadow-sm backdrop-blur-xs'>
              <div className='text-muted-foreground flex items-center gap-2 text-xs font-bold tracking-wider uppercase'>
                <Sparkles className='text-primary h-4 w-4' />
                Extracted Event Context
              </div>
              <div className='grid grid-cols-1 gap-3.5 pt-1 sm:grid-cols-2'>
                {customerEmail && (
                  <div className='bg-muted/40 space-y-1 rounded-xl border p-3.5'>
                    <span className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
                      <Mail className='text-primary/70 h-3.5 w-3.5' />
                      Customer
                    </span>
                    <p className='text-foreground truncate text-xs font-semibold'>
                      {customerEmail}
                      {customerName ? ` (${customerName})` : ''}
                    </p>
                  </div>
                )}

                {formattedAmount && (
                  <div className='bg-muted/40 space-y-1 rounded-xl border p-3.5'>
                    <span className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
                      <Receipt className='h-3.5 w-3.5 text-emerald-500' />
                      Transaction Amount
                    </span>
                    <p className='text-sm font-bold text-emerald-600 dark:text-emerald-400'>
                      {formattedAmount}
                    </p>
                  </div>
                )}

                {itemLabel && (
                  <div className='bg-muted/40 space-y-1 rounded-xl border p-3.5'>
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
                  <div className='bg-muted/40 space-y-1 rounded-xl border p-3.5'>
                    <span className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
                      <ShieldCheck className='text-primary/70 h-3.5 w-3.5' />
                      Target Resource ID
                    </span>
                    <p className='text-muted-foreground truncate font-mono text-xs font-medium'>
                      {targetId}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Technical Meta Grid */}
          <div className='grid grid-cols-2 gap-3.5'>
            <div className='bg-muted/40 space-y-1.5 rounded-xl border p-4'>
              <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                Event Type
              </span>
              <p className='text-foreground truncate font-mono text-xs font-semibold'>
                {event.eventType}
              </p>
            </div>
            <div className='bg-muted/40 space-y-1.5 rounded-xl border p-4'>
              <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                Processed At
              </span>
              <p className='text-foreground truncate text-xs font-semibold'>
                {event.processedAt
                  ? format(new Date(event.processedAt), 'MMM dd, yyyy HH:mm:ss')
                  : 'Pending'}
              </p>
            </div>
          </div>

          {/* Polar Event ID Box with 1-click copy */}
          <div className='bg-muted/40 flex items-center justify-between rounded-xl border p-4'>
            <div className='min-w-0 flex-1 space-y-1'>
              <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                Polar Event ID
              </span>
              <p className='text-foreground truncate font-mono text-xs font-semibold'>
                {event.eventId}
              </p>
            </div>
            <Button
              variant='outline'
              size='sm'
              className='ml-3 h-8 shrink-0 text-xs'
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

          {/* JSON Raw Payload Section */}
          <div className='space-y-3 pt-2'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Terminal className='text-primary h-4 w-4' />
                <span className='text-foreground text-xs font-bold tracking-wider uppercase'>
                  Full Raw Payload
                </span>
                <span className='text-muted-foreground text-xs'>
                  ({payloadString.length} chars)
                </span>
              </div>
              <Button
                variant='outline'
                size='sm'
                className='h-8 text-xs'
                onClick={() => handleCopy(payloadString, 'payload')}
              >
                {copiedKey === 'payload' ? (
                  <>
                    <Check className='mr-1.5 h-3.5 w-3.5 text-emerald-500' />
                    Copied JSON
                  </>
                ) : (
                  <>
                    <Code2 className='mr-1.5 h-3.5 w-3.5' />
                    Copy JSON
                  </>
                )}
              </Button>
            </div>

            {/* Dark modern Code Card with generous padding & clean font */}
            <div className='overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-md'>
              <div className='flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/80 px-4 py-2 font-mono text-xs text-zinc-400'>
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
              <pre className='max-h-96 overflow-auto p-4 font-mono text-xs leading-relaxed text-zinc-200'>
                {payloadString}
              </pre>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
