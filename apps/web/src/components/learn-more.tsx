import { CircleQuestionMark } from 'lucide-react'
import { type Popover as PopoverPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type LearnMoreProps = React.ComponentProps<typeof PopoverPrimitive.Root> & {
  contentProps?: React.ComponentProps<typeof PopoverPrimitive.Content>
  triggerProps?: React.ComponentProps<typeof PopoverPrimitive.Trigger>
}

export function LearnMore({
  children,
  contentProps,
  triggerProps,
  ...props
}: LearnMoreProps) {
  return (
    <Popover {...props}>
      <PopoverTrigger
        asChild
        {...triggerProps}
        className={cn('size-5 rounded-full', triggerProps?.className)}
      >
        <Button variant='outline' size='icon'>
          <span className='sr-only'>Learn more</span>
          <CircleQuestionMark className='size-4 [&>circle]:hidden' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side='top'
        align='start'
        {...contentProps}
        className={cn('text-muted-foreground text-sm', contentProps?.className)}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
