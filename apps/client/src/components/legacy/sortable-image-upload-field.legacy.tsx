"use client";

import * as React from "react";
import { useController } from "react-hook-form";
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
} from "./sortable-image-upload.legacy";
import type { ImagePayload } from "../form/types";

type DescriptionRenderState = {
  loading: boolean;
  disabled: boolean;
  value: ImagePayload[];
};

export type SortableImageUploadFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TCoverName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = Omit<
  SortableImageUploadProps,
  "value" | "onChange" | "coverIndex" | "onCoverIndexChange"
> & {
  control: Control<TFieldValues>;
  name: TName;
  coverIndexName?: TCoverName;
  coverIndex?: number | null;
  onCoverIndexChange?: (index: number | null) => void;
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

function getCoverIndex(value: unknown) {
  return typeof value === "number" ? value : null;
}

function SortableImageUploadFieldControl<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TCoverName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  formItemClassName,
  disabled = false,
  loading = false,
  coverIndex,
  onCoverIndexChange,
  ...uploadProps
}: Omit<
  SortableImageUploadFieldProps<TFieldValues, TName, TCoverName>,
  "coverIndexName"
>) {
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
                coverIndex={coverIndex}
                onCoverIndexChange={onCoverIndexChange}
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

function SortableImageUploadFieldWithCover<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TCoverName extends FieldPath<TFieldValues>,
>({
  control,
  coverIndexName,
  ...props
}: SortableImageUploadFieldProps<TFieldValues, TName, TCoverName> & {
  coverIndexName: TCoverName;
}) {
  const { field: coverField } = useController({
    control,
    name: coverIndexName,
  });

  return (
    <SortableImageUploadFieldControl
      {...props}
      control={control}
      coverIndex={getCoverIndex(coverField.value)}
      onCoverIndexChange={coverField.onChange}
    />
  );
}

/**
 * @deprecated Use the non-legacy sortable image upload field in `components/form/sortable-image-upload-field.tsx`.
 */
export default function SortableImageUploadField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TCoverName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  coverIndexName,
  ...props
}: SortableImageUploadFieldProps<TFieldValues, TName, TCoverName>) {
  if (coverIndexName) {
    return (
      <SortableImageUploadFieldWithCover
        {...props}
        control={props.control}
        coverIndexName={coverIndexName}
      />
    );
  }

  return <SortableImageUploadFieldControl {...props} />;
}
