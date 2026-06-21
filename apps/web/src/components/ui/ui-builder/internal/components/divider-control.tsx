// @ts-nocheck
import React, { useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AddComponentsPopover } from '@/components/ui/ui-builder/internal/components/add-component-popover'

type DividerControlProps = {
  className?: string
  addPosition?: number
  parentLayerId: string
}

export function DividerControl({
  className,
  addPosition,
  parentLayerId,
}: DividerControlProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  return (
    <div className={cn('relative py-0', className)}>
      <div className='absolute inset-0 flex items-center' aria-hidden='true'>
        <div className='border-primary w-full border-t border-dashed' />
      </div>
      <AddComponentsPopover
        onOpenChange={setPopoverOpen}
        addPosition={addPosition}
        parentLayerId={parentLayerId}
      >
        <Button
          variant='outline'
          className='group bg-secondary text-secondar-foreground ring-secondary flex h-min items-center gap-0 rounded-full p-2 text-sm font-semibold shadow-sm ring-1 transition-all duration-200 ease-in-out ring-inset'
        >
          <PlusCircle className='text-secondary-foreground h-5 w-5' />
          <span className='sr-only'>Add component</span>
          <span
            className={cn(
              'max-w-0 overflow-hidden transition-all duration-200 ease-in-out group-hover:max-w-xs group-hover:pl-2',
              popoverOpen ? 'max-w-xs pl-2' : 'max-w-0'
            )}
          >
            Add component
          </span>
        </Button>
      </AddComponentsPopover>
    </div>
  )
}
