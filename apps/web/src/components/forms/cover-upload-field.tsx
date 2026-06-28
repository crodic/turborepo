'use client'

import * as React from 'react'
import type {
  Control,
  ControllerRenderProps,
  FieldPath,
  FieldValues,
} from 'react-hook-form'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import CoverUpload, { type CoverUploadProps } from './cover-upload'

type DescriptionRenderState = {
  disabled: boolean
  value: File | null
}

export type CoverUploadFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Omit<CoverUploadProps, 'value' | 'onChange'> & {
  control: Control<TFieldValues>
  name: TName
  label?: React.ReactNode
  description?:
    | React.ReactNode
    | ((state: DescriptionRenderState) => React.ReactNode)
  formItemClassName?: string
}

function getFieldValue<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>(field: ControllerRenderProps<TFieldValues, TName>) {
  const value: unknown = field.value

  if (value instanceof File || value === null || value === undefined) {
    return value ?? null
  }

  return null
}

export default function CoverUploadField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  formItemClassName,
  disabled = false,
  ...uploadProps
}: CoverUploadFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value = getFieldValue(field)
        const renderedDescription =
          typeof description === 'function'
            ? description({ disabled, value })
            : description

        return (
          <FormItem className={formItemClassName}>
            {label && <FormLabel>{label}</FormLabel>}
            <FormControl>
              <CoverUpload
                {...uploadProps}
                value={value}
                onChange={field.onChange}
                disabled={disabled}
              />
            </FormControl>
            {renderedDescription && (
              <FormDescription>{renderedDescription}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
