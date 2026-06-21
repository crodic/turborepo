'use client'

import { format } from 'date-fns'
import type {
  ControllerRenderProps,
  FieldPath,
  FieldValues,
} from 'react-hook-form'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { FormControl } from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface FormDatePickerProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  field: ControllerRenderProps<TFieldValues, TName>
  label?: string
  description?: string
  placeholder?: string
  disabled?: (date: Date) => boolean
  className?: string
  dateFormat?: string
}

export function DatePickerForm<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  field,
  placeholder = 'Pick a date',
  disabled,
  className,
  dateFormat = 'yyyy-MM-dd',
}: FormDatePickerProps<TFieldValues, TName>) {
  const dateValue =
    typeof field.value === 'string' ? new Date(field.value) : field.value

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      field.onChange(format(date, dateFormat))
    } else {
      field.onChange(undefined)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant='outline'
            className={cn(
              'w-full justify-start text-left font-normal',
              !field.value && 'text-muted-foreground',
              className
            )}
          >
            <CalendarIcon className='mr-2 h-4 w-4' />
            {field.value ? (
              format(dateValue, 'PPP')
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <Calendar
          mode='single'
          captionLayout='dropdown'
          selected={dateValue}
          onSelect={handleDateSelect}
          disabled={disabled}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
