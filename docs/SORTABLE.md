# Sortable Image Upload

This document explains how to use `SortableImageUpload` on the frontend and how to structure backend APIs to handle image lists that support upload, deletion, reordering, and submission via `FormData`.

The component is designed for the following workflow:

- Loading a previously saved ordered list of images on page mount.
- Allowing users to upload new images.
- Allowing users to delete existing or newly uploaded images.
- Allowing users to drag and drop images to reorder them.
- Submitting the form with `multipart/form-data`.
- Backend saving new files into public storage (demo caches metadata/order in Redis; production persists metadata/order to the database).

## Related Files

Frontend:

- `apps/client/src/components/form/sortable-image-upload-field.tsx`
- `apps/client/src/components/form/sortable-image-upload.tsx`
- `apps/client/src/components/form/types.ts`
- `apps/client/src/components/ui/sortable.tsx`
- `apps/client/src/app/[locale]/example/page.tsx`

Backend:

- `apps/api/src/api/file/file.controller.ts`
- `apps/api/src/api/file/file.module.ts`
- `apps/api/src/api/file/sortable-image-upload.service.ts`
- `apps/api/src/api/file/sortable-image-cache.service.ts`
- `apps/api/src/api/file/dto/sortable-image.dto.ts`

## Mental Model

The frontend does not submit a simple array of URLs. Instead, it submits an array of intents:

- `existing`: An image that already exists on the server/cache, retaining its identity and updating its order.
- `new`: A newly selected image by the user, requiring the actual file binary.
- `deleted`: An image marked for deletion in the UI, used to track deletion intent in form state.

When submitting to the API, the frontend only sends active items (`existing` + `new`) in their final order. `deleted` items do not need to be sent when the backend replaces the entire list (any item not present in `items` is automatically removed).

## Frontend Types

```ts
export type ImagePayload =
  | { type: 'existing'; id: string; order: number }
  | { type: 'new'; file: File; tempId: string; order: number }
  | { type: 'deleted'; id: string };

export interface ExistingImage {
  id: string;
  src: string;
  alt?: string;
}
```

`ExistingImage[]` is the data used to render saved images. `ImagePayload[]` is the form value used for submission.

## Using the Field Component

With `react-hook-form`, prefer using `SortableImageUploadField`. This component acts as an adapter for form control:

```tsx
<SortableImageUploadField
  control={form.control}
  name="images"
  coverIndexName="coverIndex"
  label="Product Images"
  description={({ loading }) =>
    loading
      ? 'Loading saved images...'
      : 'Upload between 1 and 200 images. Drag to reorder.'
  }
  existingImages={existingImages}
  maxFiles={200}
  disabled={isLoadingImages || isSavingImages}
  loading={isLoadingImages}
/>
```

`coverIndexName` is optional. When passed, the field binds an additional `number | null` field in `react-hook-form` to allow selecting a cover image using the star button on each tile. When omitted, it acts as a standard sortable upload without cover selection.

`SortableImageUploadField` handles:

- Rendering `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, and `FormMessage`.
- Binding `field.value` and `field.onChange`.
- Binding `coverIndexName` if cover selection is required.
- Normalizing form values into `ImagePayload[]`.
- Passing upload props down to `SortableImageUpload`.

The field component does not fetch or submit API requests. The page or feature hook remains responsible for fetching `existingImages`, submitting `FormData`, and resetting the form after a successful save.

## Using the Core Component

When not using `react-hook-form` or when custom field composition is required, use the core component directly:

```tsx
<SortableImageUpload
  existingImages={existingImages}
  value={field.value}
  onChange={field.onChange}
  maxFiles={200}
  disabled={isLoadingImages || isSavingImages}
  loading={isLoadingImages}
/>
```

Key Props:

- `existingImages`: List of existing images from server/cache.
- `value`: `ImagePayload[]` managed by React Hook Form or state.
- `onChange`: Callback to sync state back to the form.
- `maxFiles`: Maximum number of active images allowed.
- `disabled`: Disables interaction during saving or in read-only mode.
- `loading`: Displays skeleton placeholders and hides the dropzone during initial load.

UX Details:

- When empty: Displays the dropzone `Choose a file or drag & drop here`.
- When images exist: Hides the dropzone and displays an `Add image` button.
- Users can drag directly on any image tile to reorder.
- Clicking an image opens a fullscreen preview/lightbox (supports left/right arrows and `Esc` to close).
- Delete button stops propagation so it doesn't trigger drag.
- When `loading=true`: Displays skeleton tiles only.

## React Hook Form and Zod Integration

Example schema:

```ts
const existingImageSchema = z.object({
  type: z.literal('existing'),
  id: z.string(),
  order: z.number(),
});

const newImageSchema = z.object({
  type: z.literal('new'),
  file: z.instanceof(File, { message: 'Must be a valid File' }),
  tempId: z.string(),
  order: z.number(),
});

const deletedImageSchema = z.object({
  type: z.literal('deleted'),
  id: z.string(),
});

const imagePayloadSchema = z.discriminatedUnion('type', [
  existingImageSchema,
  newImageSchema,
  deletedImageSchema,
]);

const imagesSchema = z
  .array(imagePayloadSchema)
  .refine(
    (images) => images.filter((img) => img.type !== 'deleted').length >= 1,
    { message: 'At least 1 image is required' },
  )
  .refine(
    (images) => images.filter((img) => img.type !== 'deleted').length <= 200,
    { message: 'Maximum 200 images allowed' },
  );

const formSchema = z.object({
  images: imagesSchema,
  coverIndex: z.number().int().nonnegative().nullable(),
});
```

Form initialization:

```ts
const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    images: [],
    coverIndex: null,
  },
});
```

When loading images from an API, convert response to `ExistingImage[]` and reset form:

```ts
function toExistingPayloads(images: ExistingImage[]): ImagePayload[] {
  return images.map((image, order) => ({
    type: 'existing',
    id: image.id,
    order,
  }));
}

form.reset({
  images: toExistingPayloads(cachedImages),
  coverIndex: cachedImages.length > 0 ? 0 : null,
});
```

If the API returns a saved cover ID (e.g. `coverImageId`), map `coverIndex` accordingly:

```ts
form.reset({
  images: toExistingPayloads(cachedImages),
  coverIndex: cachedImages.findIndex((image) => image.id === coverImageId),
});
```

If `findIndex` returns `-1`, normalize to `null`.

## Initial Data Loading

API:

```http
GET /api/v1/files/sortable-images/:ownerKey
```

Response:

```json
{
  "ownerKey": "demo-user",
  "coverIndex": 0,
  "images": [
    {
      "id": "a1b2c3",
      "src": "http://localhost:8000/storage/public/image/sortable-images/a1b2c3.png",
      "alt": "front.png",
      "order": 0
    }
  ]
}
```

Frontend load:

```ts
const response = await fetch(SORTABLE_IMAGES_API_URL, { cache: 'no-store' });
const data = (await response.json()) as SortableImageApiResponse;

const cachedImages = toExistingImages(data.images);
setExistingImages(cachedImages);
form.reset({
  images: toExistingPayloads(cachedImages),
  coverIndex: data.coverIndex,
});
```

`ownerKey` identifies the image bucket. The demo uses `demo-user`. Production should use a real key, for example:

- `user:${userId}:gallery`
- `product:${productId}:images`
- `tenant:${tenantId}:post:${postId}:images`

## Submitting FormData

API:

```http
POST /api/v1/files/sortable-images/:ownerKey
Content-Type: multipart/form-data
```

Fields:

- `items`: JSON string representing active images in their final order.
- `coverIndex`: Optional number indicating the cover image index.
- `files`: Binary files appended in the order of items with `{ type: "new" }`.

Example `items`:

```json
[
  {
    "type": "existing",
    "id": "old-image-id",
    "src": "http://localhost:8000/storage/public/image/sortable-images/old-image-id.png",
    "alt": "old.png"
  },
  {
    "type": "new",
    "tempId": "new-123",
    "alt": "new.png"
  }
]
```

Building `FormData`:

```ts
function buildSortableImagesFormData(
  images: ImagePayload[],
  existingImages: ExistingImage[],
  coverIndex?: number | null,
) {
  const formData = new FormData();
  const existingImageById = new Map(
    existingImages.map((image) => [image.id, image]),
  );

  const activeImages = images
    .filter(
      (image): image is ImagePayload & { type: 'existing' | 'new' } =>
        image.type === 'existing' || image.type === 'new',
    )
    .sort((a, b) => a.order - b.order);

  formData.append(
    'items',
    JSON.stringify(
      activeImages.map((image) => {
        if (image.type === 'existing') {
          const existingImage = existingImageById.get(image.id);

          return {
            type: 'existing',
            id: image.id,
            src: existingImage?.src,
            alt: existingImage?.alt ?? 'Image',
          };
        }

        return {
          type: 'new',
          tempId: image.tempId,
          alt: image.file.name,
        };
      }),
    ),
  );

  if (typeof coverIndex === 'number') {
    formData.append('coverIndex', String(coverIndex));
  }

  activeImages.forEach((image) => {
    if (image.type === 'new') {
      formData.append('files', image.file, image.file.name);
    }
  });

  return formData;
}
```

Submission:

```ts
const response = await fetch(SORTABLE_IMAGES_API_URL, {
  method: 'POST',
  body: buildSortableImagesFormData(
    data.images,
    existingImages,
    data.coverIndex,
  ),
});
```

Do not set `Content-Type` manually when sending `FormData`; the browser will automatically add the boundary.

After the API returns the saved list, reset the form so all items become `existing`:

```ts
const saved = (await response.json()) as SortableImageApiResponse;
const savedImages = toExistingImages(saved.images);

setExistingImages(savedImages);
form.reset({
  images: toExistingPayloads(savedImages),
});
```

## Why Form Reset is Required

Initially, a newly added image is:

```ts
{
  type: ('new', file, tempId, order);
}
```

Once saved on the backend, it becomes a persisted server image:

```ts
{ type: 'existing', id: publicId, order }
```

Without resetting the form, subsequent submissions could re-upload the same file binary or lose synchronization between `tempId` and the server `id`.

## Reusable Backend Service

The core upload and sorting logic is encapsulated in `SortableImageUploadService`.

This service is database- and Redis-agnostic. It simply accepts:

- `currentImages`: Currently stored images.
- `items`: The parsed JSON items from the client.
- `files`: The binary files from the multipart request.
- Optional configuration such as upload folder and max file size.

It returns `nextImages` with new files uploaded and ordered properly. The calling controller/service decides where to persist `nextImages` (PostgreSQL, Redis, S3, etc.).

```ts
const nextImages = await this.sortableImageUploadService.buildNextImages({
  currentImages,
  rawItems: items,
  files,
  uploadFolder: 'products',
  maxImageSize: 10 * 1024 * 1024,
});
```

Input `currentImages`:

```ts
type SortableImageStoredItem = {
  id: string;
  src: string;
  alt: string;
  filePublicId?: string;
  path?: string;
};
```

Output `nextImages` is also `SortableImageStoredItem[]` adhering to the user-selected order.

Example with database persistence:

```ts
const currentRows = await this.productImageRepo.find({
  where: { productId },
  order: { order: 'ASC' },
});

const currentImages = currentRows.map((row) => ({
  id: row.imageId,
  src: row.src,
  alt: row.alt,
  filePublicId: row.filePublicId,
  path: row.path,
}));

const nextImages = await this.sortableImageUploadService.buildNextImages({
  currentImages,
  rawItems: items,
  files,
  uploadFolder: 'products',
});

await this.productImageRepo.delete({ productId });

await this.productImageRepo.save(
  nextImages.map((image, order) => ({
    productId,
    imageId: image.id,
    src: image.src,
    alt: image.alt,
    path: image.path,
    filePublicId: image.filePublicId,
    order,
  })),
);
```

To inject the service into another module:

```ts
@Module({
  imports: [FileModule],
})
export class ProductModule {}
```

```ts
constructor(
  private readonly sortableImageUploadService: SortableImageUploadService,
) {}
```

## Production Checklist

- Replace `ownerKey = "demo-user"` with real identifiers (e.g., `user:${userId}:gallery`, `product:${productId}:images`).
- Authenticate and authorize requests before modifying images associated with an `ownerKey`.
- Define a file deletion strategy when images are removed from the list.
- In production, persist `nextImages` and order to PostgreSQL instead of caching only in Redis.
- If using AWS S3 or CDN, configure the S3 disk in `FileModule` and return CDN URLs.
- Validate file size and MIME types on both client and server.
- Always reset the form after successful saves so `new` items transition to `existing`.
