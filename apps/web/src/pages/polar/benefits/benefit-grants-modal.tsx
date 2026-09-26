import { format } from 'date-fns'
import { Shield, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useDataPolarBenefitGrants } from '../queries'
import type { PolarBenefitSchema } from '../schema'

interface BenefitGrantsModalProps {
  benefit: PolarBenefitSchema | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BenefitGrantsModal({
  benefit,
  open,
  onOpenChange,
}: BenefitGrantsModalProps) {
  const { data: grants, isLoading } = useDataPolarBenefitGrants(benefit?.id)

  const items = Array.isArray(grants) ? grants : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Shield className='text-primary size-5' />
            Granted Customer Entitlements
          </DialogTitle>
          <DialogDescription>
            Active grants for benefit &quot;{benefit?.description}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 pt-2'>
          {isLoading ? (
            <div className='space-y-2'>
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
            </div>
          ) : items.length > 0 ? (
            <div className='divide-y rounded-lg border'>
              {items.map((grant: any) => {
                const isGranted = grant.isGranted ?? !grant.revokedAt
                return (
                  <div
                    key={grant.id}
                    className='flex items-center justify-between p-3 text-sm'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='bg-muted flex size-8 items-center justify-center rounded-full'>
                        <User className='text-muted-foreground size-4' />
                      </div>
                      <div className='flex flex-col'>
                        <span className='font-medium'>
                          {grant.customer?.email ||
                            grant.customerEmail ||
                            grant.customerId ||
                            'Customer'}
                        </span>
                        <span className='text-muted-foreground text-xs'>
                          Granted:{' '}
                          {grant.createdAt
                            ? format(
                                new Date(grant.createdAt),
                                'dd/MM/yyyy HH:mm'
                              )
                            : '-'}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={isGranted ? 'default' : 'secondary'}
                      className='text-xs'
                    >
                      {isGranted ? 'Granted' : 'Revoked'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className='text-muted-foreground py-8 text-center text-sm'>
              No customer has been granted this benefit yet.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
