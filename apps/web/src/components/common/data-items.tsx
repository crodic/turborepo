import { type ReactNode } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible'
import { Table, TableBody, TableCell, TableRow } from '../ui/table'

interface DataItem {
  label: string
  value: string | ReactNode
}

interface DataItemsProps {
  data: DataItem[]
  title: string
  description?: string
  icon?: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>
  mode?: 'collapse' | 'default'
}

export default function DataItems({
  data,
  title,
  description,
  mode = 'default',
  ...props
}: DataItemsProps) {
  if (mode === 'collapse') {
    return (
      <Collapsible className='bg-card border-input overflow-hidden rounded-lg border'>
        <CollapsibleTrigger className='bg-muted/30 hover:bg-muted/50 flex w-full items-center justify-between px-4 py-3 transition-colors'>
          <div className='flex items-center gap-2'>
            {props.icon && <props.icon className='text-primary h-4 w-4' />}
            <h4 className='text-foreground font-medium'>{title}</h4>
            {description && (
              <p className='text-muted-foreground text-sm'>{description}</p>
            )}
          </div>
          <ChevronDown className='text-muted-foreground h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180' />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Table>
            <TableBody>
              {data.map((f) => (
                <TableRow key={f.label}>
                  <TableCell className='text-muted-foreground w-1/3 font-medium'>
                    {f.label}
                  </TableCell>
                  <TableCell>{f.value || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <div className='bg-card border-input overflow-hidden rounded-lg border'>
      <div className='bg-muted/30 border-input flex items-center gap-2 border-b px-4 py-3'>
        {props.icon && <props.icon className='text-primary h-4 w-4' />}
        <h4 className='text-foreground font-medium'>{title}</h4>
        {description && (
          <span className='text-muted-foreground text-sm'>{description}</span>
        )}
      </div>
      <Table>
        <TableBody>
          {data.map((f) => (
            <TableRow key={f.label}>
              <TableCell className='text-muted-foreground w-1/3 font-medium'>
                {f.label}
              </TableCell>
              <TableCell>{f.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
