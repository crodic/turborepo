# Sortable Image Upload

Tài liệu này mô tả cách dùng `SortableImageUpload` ở frontend và cách viết API backend để xử lý danh sách ảnh có thể upload, xoá, sắp xếp lại thứ tự, rồi submit bằng `FormData`.

Component hiện dùng cho use case:

- Vào page load danh sách ảnh đã lưu trước đó theo đúng thứ tự.
- User upload thêm ảnh mới.
- User xoá ảnh đã lưu hoặc ảnh mới upload.
- User kéo thả để đổi thứ tự ảnh.
- Submit form bằng `multipart/form-data`.
- Backend lưu file mới vào storage public. Demo hiện tại cache metadata/order trong Redis; production có thể lưu metadata/order vào DB.

## File Liên Quan

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

Frontend không submit trực tiếp một mảng URL đơn giản. Nó submit một danh sách intent:

- `existing`: ảnh đã tồn tại trên server/cache, giữ lại và cập nhật order.
- `new`: ảnh mới user vừa chọn, cần gửi kèm file thật.
- `deleted`: ảnh đã bị xoá khỏi UI, dùng để biểu diễn ý định xoá ở form state.

Khi submit API hiện tại, FE chỉ gửi các item active (`existing` + `new`) theo đúng thứ tự cuối cùng. Item `deleted` không cần gửi lên endpoint cache hiện tại vì backend lưu lại toàn bộ danh sách mới; ảnh nào không còn trong `items` sẽ biến mất khỏi danh sách cache.

## Types FE

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

`ExistingImage[]` là dữ liệu dùng để render ảnh đã lưu. `ImagePayload[]` là form value dùng để submit.

## Dùng Field Component

Với `react-hook-form`, ưu tiên dùng `SortableImageUploadField`. Component này là adapter cho form, giống pattern field component khác:

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

`coverIndexName` là optional. Nếu truyền prop này, field sẽ bind thêm một field number/null trong `react-hook-form` để user chọn ảnh cover bằng nút star trên từng ảnh. Nếu không truyền, component hoạt động như sortable upload bình thường và không hiển thị cover UI.

`SortableImageUploadField` xử lý:

- render `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`;
- bind `field.value` và `field.onChange`;
- bind `coverIndexName` nếu cần chọn ảnh cover;
- normalize form value thành `ImagePayload[]`;
- truyền các props upload xuống `SortableImageUpload`.

Field component không fetch API và không submit API. Page hoặc feature hook vẫn chịu trách nhiệm load `existingImages`, submit `FormData`, rồi reset form sau khi save thành công.

## Dùng Core Component

Khi không dùng `react-hook-form`, hoặc cần tự compose field UI, dùng core component trực tiếp:

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

Props quan trọng:

- `existingImages`: danh sách ảnh đã có từ server/cache.
- `value`: `ImagePayload[]` do React Hook Form quản lý.
- `onChange`: callback để component sync state về form.
- `maxFiles`: giới hạn số ảnh active.
- `disabled`: khoá thao tác khi đang save hoặc khi form không cho edit.
- `loading`: hiển thị skeleton, ẩn upload/dropzone trong lúc load ảnh ban đầu.

UX hiện tại:

- Khi chưa có ảnh: hiện dropzone `Choose a file or drag & drop here`.
- Khi đã có ảnh: ẩn dropzone, hiện nút `Add image`.
- Có thể kéo trực tiếp trên toàn bộ tile ảnh để sort.
- Nút xoá đã stop event để không kích hoạt drag.
- Khi `loading=true`: chỉ hiển thị skeleton, không hiện upload/dropzone.

## Tích Hợp React Hook Form Và Zod

Ví dụ schema:

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

Khởi tạo form:

```ts
const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    images: [],
    coverIndex: null,
  },
});
```

Khi load ảnh từ API, convert response thành `ExistingImage[]`, rồi reset form:

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

Nếu API có trả cover đã lưu, set `coverIndex` theo vị trí của ảnh cover trong danh sách đã sort. Ví dụ DB lưu `coverImageId` thì map như sau:

```ts
form.reset({
  images: toExistingPayloads(cachedImages),
  coverIndex: cachedImages.findIndex((image) => image.id === coverImageId),
});
```

Nếu `findIndex` trả `-1`, normalize về `null`.

## Load Dữ Liệu Ban Đầu

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

FE load:

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

`ownerKey` là key định danh bucket ảnh. Trong demo đang dùng `demo-user`. Production nên dùng key thật, ví dụ:

- `user:${userId}:gallery`
- `product:${productId}:images`
- `tenant:${tenantId}:post:${postId}:images`

## Submit FormData

API:

```http
POST /api/v1/files/sortable-images/:ownerKey
Content-Type: multipart/form-data
```

Fields:

- `items`: JSON string, là danh sách active images theo đúng thứ tự cuối cùng.
- `coverIndex`: optional number, vị trí ảnh cover trong danh sách sau khi sort.
- `files`: các file mới, append theo đúng thứ tự các item `{ type: "new" }`.

Ví dụ `items`:

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

Build `FormData`:

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

Submit:

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

Không set header `Content-Type` thủ công khi dùng `FormData`. Browser sẽ tự set boundary.

Sau khi API trả về danh sách đã lưu, reset form về toàn bộ `existing`:

```ts
const saved = (await response.json()) as SortableImageApiResponse;
const savedImages = toExistingImages(saved.images);

setExistingImages(savedImages);
form.reset({
  images: toExistingPayloads(savedImages),
});
```

## Vì Sao Phải Reset Sau Submit

Ảnh mới ban đầu là:

```ts
{
  type: ('new', file, tempId, order);
}
```

Sau khi backend lưu file, ảnh đó đã trở thành ảnh server:

```ts
{ type: "existing", id: publicId, order }
```

Nếu không reset form, lần submit tiếp theo FE có thể gửi lại file cũ như ảnh mới, hoặc mất đồng bộ giữa `tempId` và `id` thật trên server.

## Backend Service Tái Sử Dụng

Phần upload/sort thực tế nằm trong `SortableImageUploadService`.

Service này được thiết kế để tái sử dụng ở bất kỳ controller/service nghiệp vụ nào. Nó không biết Redis, không biết DB, không biết entity cụ thể của product/post/user. Nó chỉ nhận:

- danh sách ảnh hiện tại đã load từ nơi lưu trữ của bạn (`currentImages`);
- `items` JSON từ FE;
- danh sách file mới từ multipart (`files`);
- config tuỳ chọn như folder upload và max size.

Sau đó service trả về `nextImages` đã upload file mới và sắp xếp đúng thứ tự. Controller/service nghiệp vụ sẽ tự quyết định lưu `nextImages` vào DB, Redis, hoặc storage khác.

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

Output `nextImages` cũng là `SortableImageStoredItem[]`, nhưng đã theo đúng order cuối cùng user chọn.

Ví dụ dùng trong service production có DB:

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

Để inject service này ở module khác:

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

`FileModule` đã export `SortableImageUploadService`, nên các module khác chỉ cần import `FileModule`.

## Backend Controller Demo Với Redis

Controller public endpoints hiện nằm trong `FileController`. Đây là implementation demo/cache, không phải pattern bắt buộc cho production.

```ts
@Get("sortable-images/:ownerKey")
@ApiPublic({ type: SortableImageListResDto })
getSortableImages(@Param("ownerKey") ownerKey: string) {
  return this.sortableImageCacheService.findAll(ownerKey);
}

@Post("sortable-images/:ownerKey")
@ApiPublic({ type: SortableImageListResDto })
@ApiConsumes("multipart/form-data")
@UseInterceptors(
  FilesInterceptor("files", 200, {
    ...memoryStorageConfig,
    limits: { fileSize: 10 * 1024 * 1024 },
  })
)
saveSortableImages(
  @Param("ownerKey") ownerKey: string,
  @Body("items") items: string,
  @UploadedFiles() files: Express.Multer.File[] = []
) {
  return this.sortableImageCacheService.save(ownerKey, items, files);
}
```

Mặc dù controller class có guard admin/policy, `@ApiPublic()` set metadata `Public()` để public endpoint bypass auth guard theo pattern hiện có trong repo.

## Backend Cache Service Flow

`SortableImageCacheService` chỉ là wrapper demo quanh `SortableImageUploadService`.

Flow hiện tại:

1. Lấy danh sách hiện tại từ Redis bằng key `sortable-images:${ownerKey}`.
2. Gọi `sortableImageUploadService.buildNextImages(...)`.
3. Normalize `coverIndex` nếu FE có gửi.
4. Ghi toàn bộ `nextImages` và `coverIndex` vào Redis.
5. Trả response có `order` và `coverIndex`.

Trong thực tế production, thay Redis bằng DB:

- load `currentImages` từ DB;
- gọi `buildNextImages`;
- persist `nextImages` + `order` vào DB.

File mới được lưu ở:

```text
apps/api/storage/public/image/sortable-images/{publicId}.{ext}
```

URL public:

```text
{APP_URL}/storage/public/image/sortable-images/{publicId}.{ext}
```

Redis cache value:

```ts
type SortableImageCacheItem = {
  id: string;
  src: string;
  alt: string;
  filePublicId?: string;
  path?: string;
};

type SortableImageCacheState = {
  images: SortableImageCacheItem[];
  coverIndex: number | null;
};
```

## Redis Key

```ts
const cacheKey = `sortable-images:${ownerKey}`;
```

Ví dụ:

```text
sortable-images:user:123:gallery
sortable-images:product:456:images
```

Nếu cần multi-tenant, luôn đưa `tenantId` vào `ownerKey`.

## Xoá Ảnh

Hiện tại endpoint cache hoạt động theo kiểu replace toàn bộ danh sách:

- ảnh nào không có trong `items` sau submit sẽ bị remove khỏi Redis list;
- file vật lý cũ chưa bị delete khỏi storage.

Production có thể mở rộng:

- so sánh `currentImages` và `nextImages`;
- tìm ảnh bị remove;
- gọi storage delete theo `path`;
- nếu dùng DB file entity thì xoá record hoặc soft delete.

## Error Thường Gặp

`items must be valid JSON`

- `items` không phải JSON string hợp lệ.
- Kiểm tra `formData.append("items", JSON.stringify(...))`.

`items must be a JSON array`

- `items` đang là object, không phải array.

`Missing file for new image item`

- Trong `items` có `{ type: "new" }` nhưng FE không append đủ file vào field `files`.
- Số lượng file append phải bằng số item new, và đúng thứ tự.

`Image "{id}" was not found`

- FE gửi existing item chỉ có `id`, nhưng danh sách hiện tại backend load ra không có image đó và item không có `src`.
- Với ảnh existing ngoài cache/DB hiện tại, gửi thêm `src` để backend giữ lại.

`{filename} must be an image`

- File mimetype không bắt đầu bằng `image/`.

`{filename} is too large`

- File vượt `maxImageSize` của service hoặc Multer limit.

## Production Checklist

- Thay `ownerKey = "demo-user"` bằng key thật theo user/product/post.
- Không tin `ownerKey` public nếu dữ liệu nhạy cảm. Thêm auth hoặc ký ownerKey nếu cần.
- Chọn chiến lược xoá file vật lý khi ảnh bị remove khỏi list.
- Production nên load `currentImages` từ DB, gọi `SortableImageUploadService.buildNextImages(...)`, rồi persist `nextImages` + `order` lại DB.
- Import `FileModule` ở module nghiệp vụ để inject lại `SortableImageUploadService` trong controller/service bất kỳ.
- Nếu dùng S3/CDN, thay public disk bằng S3 disk và trả CDN URL.
- Không lưu base64 vào Redis cho ảnh mới; chỉ cache metadata/order.
- Validate file size/mimetype cả frontend và backend.
- Luôn reset form sau khi save thành công để ảnh `new` chuyển thành `existing`.
- Không set `Content-Type` thủ công khi gửi `FormData`.

## Ví Dụ Flow Hoàn Chỉnh

1. Page mount.
2. FE gọi `GET /api/v1/files/sortable-images/product:123:images`.
3. API trả ảnh đã cache theo order.
4. FE map response thành `ExistingImage[]`.
5. FE reset RHF `images` thành payload `existing`.
6. User add/sort/delete ảnh.
7. `SortableImageUpload` gọi `onChange(ImagePayload[])`.
8. User submit form.
9. FE build `FormData`.
10. API upload file mới vào storage, giữ existing, drop ảnh không còn trong list.
11. Demo API cache danh sách mới và `coverIndex` trong Redis; production persist danh sách mới và cover vào DB.
12. FE nhận response, reset form lại thành toàn bộ `existing`.
