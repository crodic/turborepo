"use client";

import * as React from "react";
import type {
  Control,
  FieldPath,
  FieldValues,
  ControllerRenderProps,
} from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import SortableImageUpload, {
  type SortableImageUploadProps,
} from "./sortable-image-upload";
import type { ImagePayload } from "./types";

type DescriptionRenderState = {
  loading: boolean;
  disabled: boolean;
  value: ImagePayload[];
};

export type SortableImageUploadFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Omit<SortableImageUploadProps, "value" | "onChange"> & {
  control: Control<TFieldValues>;
  name: TName;
  label?: React.ReactNode;
  description?:
    | React.ReactNode
    | ((state: DescriptionRenderState) => React.ReactNode);
  formItemClassName?: string;
};

function getFieldValue<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>(field: ControllerRenderProps<TFieldValues, TName>) {
  return Array.isArray(field.value) ? (field.value as ImagePayload[]) : [];
}

export default function SortableImageUploadField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  formItemClassName,
  disabled = false,
  loading = false,
  ...uploadProps
}: SortableImageUploadFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value = getFieldValue(field);
        const renderedDescription =
          typeof description === "function"
            ? description({ loading, disabled, value })
            : description;

        return (
          <FormItem className={formItemClassName}>
            {label && <FormLabel>{label}</FormLabel>}
            <FormControl>
              <SortableImageUpload
                {...uploadProps}
                value={value}
                onChange={field.onChange}
                disabled={disabled}
                loading={loading}
              />
            </FormControl>
            {renderedDescription && (
              <FormDescription>{renderedDescription}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
