"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import SortableImageUpload from "@/components/form/sortable-image-upload";
import type { ExistingImage, ImagePayload } from "@/components/form/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import CoverUpload from "@/components/form/cover-upload";

// Simulated existing images from server (edit flow)
const mockExistingImages: ExistingImage[] = [
  {
    id: "server-1",
    src: "https://picsum.photos/400/300?random=1",
    alt: "Product view 1",
  },
  {
    id: "server-2",
    src: "https://picsum.photos/400/300?random=2",
    alt: "Product view 2",
  },
  {
    id: "server-3",
    src: "https://picsum.photos/400/300?random=3",
    alt: "Product view 3",
  },
];

// Zod schema for ImagePayload validation
const existingImageSchema = z.object({
  type: z.literal("existing"),
  id: z.string(),
  order: z.number(),
});

const newImageSchema = z.object({
  type: z.literal("new"),
  file: z.instanceof(File, { message: "Must be a valid File" }),
  tempId: z.string(),
  order: z.number(),
});

const deletedImageSchema = z.object({
  type: z.literal("deleted"),
  id: z.string(),
});

const imagePayloadSchema = z.discriminatedUnion("type", [
  existingImageSchema,
  newImageSchema,
  deletedImageSchema,
]);

// Custom validation: count only active images (existing + new, excluding deleted)
const imagesSchema = z
  .array(imagePayloadSchema)
  .refine(
    (images) => {
      const activeImages = images.filter((img) => img.type !== "deleted");
      return activeImages.length >= 1;
    },
    { message: "At least 1 image is required" }
  )
  .refine(
    (images) => {
      const activeImages = images.filter((img) => img.type !== "deleted");
      return activeImages.length <= 200;
    },
    { message: "Maximum 200 images allowed" }
  );

const formSchema = z.object({
  images: imagesSchema,
  cover: z.instanceof(File, { message: "Must be a valid File" }).nullish(),
});

type FormData = z.infer<typeof formSchema>;

export default function ImageUploadDemo() {
  const [submittedData, setSubmittedData] = useState<ImagePayload[] | null>(
    null
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      images: mockExistingImages.map((img, index) => ({
        type: "existing" as const,
        id: img.id,
        order: index,
      })),
    },
  });

  const currentValue = form.watch("images");

  const onSubmit = (data: FormData) => {
    setSubmittedData(data.images);
  };

  const handleReset = () => {
    form.reset({
      images: mockExistingImages.map((img, index) => ({
        type: "existing" as const,
        id: img.id,
        order: index,
      })),
    });
    setSubmittedData(null);
  };

  return (
    <main className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">
            Image Upload with React Hook Form
          </h1>
          <p className="text-muted-foreground">
            Edit flow: reorder, add, and delete images with proper form state
            management
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Images</FormLabel>
                  <FormControl>
                    <SortableImageUpload
                      existingImages={mockExistingImages}
                      value={field.value}
                      onChange={field.onChange}
                      maxFiles={200}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload between 1 and 200 images. Drag to reorder.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cover"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Cover</FormLabel>
                  <FormControl>
                    <CoverUpload
                      value={field.value}
                      onChange={field.onChange}
                      accept="image/png"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-center gap-4">
              <Button type="submit" size="lg">
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleReset}
              >
                Reset
              </Button>
            </div>
          </form>
        </Form>

        {/* Debug: Show current form value */}
        <Card>
          <CardHeader>
            <CardTitle>Current Form Value</CardTitle>
            <CardDescription>
              Real-time view of the ImagePayload[] being tracked by
              react-hook-form
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted max-h-64 overflow-auto rounded-lg p-4 text-xs">
              {JSON.stringify(
                currentValue?.map((p) => {
                  if (p.type === "new") {
                    return { ...p, file: `[File: ${p.file.name}]` };
                  }
                  return p;
                }),
                null,
                2
              )}
            </pre>
          </CardContent>
        </Card>

        {/* Show submitted data */}
        {submittedData && (
          <Card className="border-green-500/50">
            <CardHeader>
              <CardTitle className="text-green-600">
                Submitted Payload
              </CardTitle>
              <CardDescription>
                This is what would be sent to your server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted max-h-64 overflow-auto rounded-lg p-4 text-xs">
                {JSON.stringify(
                  submittedData.map((p) => {
                    if (p.type === "new") {
                      return { ...p, file: `[File: ${p.file.name}]` };
                    }
                    return p;
                  }),
                  null,
                  2
                )}
              </pre>

              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <strong>Summary:</strong>
                </p>
                <ul className="text-muted-foreground list-inside list-disc space-y-1">
                  <li>
                    Existing images to keep:{" "}
                    {submittedData.filter((p) => p.type === "existing").length}
                  </li>
                  <li>
                    New images to upload:{" "}
                    {submittedData.filter((p) => p.type === "new").length}
                  </li>
                  <li>
                    Images to delete:{" "}
                    {submittedData.filter((p) => p.type === "deleted").length}
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
