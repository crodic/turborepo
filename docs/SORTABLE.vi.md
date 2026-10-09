# Tải Lên Hình Ảnh Kèm Sắp Xếp (Sortable Image Upload)

> [English](SORTABLE.md) | **Tiếng Việt**

Tài liệu này giải thích cách sử dụng `SortableImageUpload` trên frontend và cách thiết kế cấu trúc API phía backend để xử lý danh sách ảnh hỗ trợ tải lên, xóa bỏ, sắp xếp lại thứ tự (drag & drop), và gửi dữ liệu thông qua `FormData`.

Component này được thiết kế phục vụ quy trình làm việc sau:

- Tải danh sách ảnh đã lưu theo thứ tự trước đó khi component được gắn kết (mount).
- Cho phép người dùng tải lên các ảnh mới.
- Cho phép người dùng xóa ảnh đã có hoặc ảnh mới thêm vào.
- Cho phép người dùng kéo thả (drag and drop) các ảnh để sắp xếp lại thứ tự.
- Gửi form dưới định dạng `multipart/form-data`.
- Backend lưu trữ các tệp mới vào storage công khai (bản demo lưu tạm metadata/thứ tự trong Redis; môi trường production sẽ lưu metadata/thứ tự vào cơ sở dữ liệu).

## Các Tệp Liên Quan

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

## Mô Hình Tư Duy (Mental Model)

Frontend không gửi một mảng URL đơn thuần. Thay vào đó, nó gửi một mảng các "ý định" (intents):

- `existing`: Một hình ảnh đã tồn tại sẵn trên máy chủ/bộ nhớ cache, giữ nguyên danh tính (ID) và cập nhật số thứ tự (order).
- `new`: Một hình ảnh mới được người dùng chọn tải lên, kèm theo dữ liệu tệp nhị phân thực tế (`File`).
- `deleted`: Một hình ảnh được đánh dấu xóa trên giao diện người dùng, dùng để theo dõi ý định xóa trong trạng thái form.

Khi gửi dữ liệu tới API, frontend chỉ gửi các mục đang hoạt động (`existing` + `new`) theo đúng thứ tự cuối cùng của chúng. Các mục `deleted` không nhất thiết phải gửi khi backend sử dụng cơ chế thay thế toàn bộ danh sách (bất kỳ mục nào không có trong `items` gửi lên sẽ tự động bị xóa).

## Kiểu Dữ Liệu Frontend (Frontend Types)

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

`ExistingImage[]` là dữ liệu dùng để render danh sách ảnh đã lưu. `ImagePayload[]` là giá trị biểu mẫu (form value) dùng để gửi lên máy chủ.

## Sử Dụng Component Trường Biểu Mẫu (SortableImageUploadField)

Khi kết hợp với `react-hook-form`, ưu tiên sử dụng `SortableImageUploadField`. Component này đóng vai trò adapter kết nối với form controller:

```tsx
<SortableImageUploadField
  control={form.control}
  name="images"
  coverIndexName="coverIndex"
  label="Product Images"
  description={({ loading }) =>
    loading
      ? 'Đang tải danh sách ảnh đã lưu...'
      : 'Tải lên từ 1 đến 200 hình ảnh. Kéo thả để sắp xếp lại thứ tự.'
  }
  existingImages={existingImages}
  maxFiles={200}
  disabled={isLoadingImages || isSavingImages}
  loading={isLoadingImages}
/>
```

`coverIndexName` là tùy chọn. Khi được truyền vào, trường này sẽ liên kết thêm một giá trị `number | null` trong `react-hook-form` cho phép chọn ảnh đại diện (cover) bằng nút ngôi sao trên mỗi thẻ ảnh. Khi bỏ qua prop này, component hoạt động như một bộ tải ảnh sắp xếp thông thường không có tính năng chọn ảnh bìa.

`SortableImageUploadField` xử lý:

- Render các phần tử `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, và `FormMessage`.
- Ràng buộc hai chiều `field.value` và `field.onChange`.
- Ràng buộc `coverIndexName` nếu cần chọn ảnh bìa.
- Chuẩn hóa các giá trị form thành `ImagePayload[]`.
- Truyền các thuộc tính upload xuống component lõi `SortableImageUpload`.

Component trường này không tự gọi API hay submit request. Trang hoặc custom hook của tính năng chịu trách nhiệm fetch `existingImages`, gửi `FormData`, và reset form sau khi lưu thành công.

## Sử Dụng Component Lõi (SortableImageUpload)

Khi không dùng `react-hook-form` hoặc khi cần tự tùy biến cấu trúc trường nhập, sử dụng trực tiếp component lõi:

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

Các Props quan trọng:

- `existingImages`: Danh sách ảnh đã tồn tại từ máy chủ/cache.
- `value`: Mảng `ImagePayload[]` do React Hook Form hoặc state quản lý.
- `onChange`: Callback đồng bộ trạng thái ngược lại form.
- `maxFiles`: Số lượng ảnh tối đa cho phép hiển thị và lưu trữ.
- `disabled`: Vô hiệu hóa tương tác trong khi đang lưu hoặc ở chế độ chỉ đọc (read-only).
- `loading`: Hiển thị khung chờ (skeleton placeholder) và ẩn vùng thả file trong lúc tải dữ liệu ban đầu.

Chi tiết trải nghiệm người dùng (UX):

- Khi danh sách trống: Hiển thị vùng kéo thả `Choose a file or drag & drop here`.
- Khi đã có ảnh: Ẩn vùng kéo thả lớn và hiển thị nút nhỏ `Add image`.
- Người dùng có thể kéo trực tiếp bất kỳ ô ảnh nào để đổi vị trí.
- Nhấp vào ảnh sẽ mở bộ xem trước toàn màn hình (lightbox) phóng to (hỗ trợ phím mũi tên trái/phải và phím `Esc` để đóng).
- Nút xóa ngăn chặn sự kiện nổi bọt (`stopPropagation`) để không kích hoạt nhầm thao tác kéo thả.
- Khi `loading=true`: Chỉ hiển thị các ô skeleton chờ dữ liệu.

## Tích Hợp React Hook Form Và Zod

Ví dụ định nghĩa schema:

```ts
const existingImageSchema = z.object({
  type: z.literal('existing'),
  id: z.string(),
  order: z.number(),
});

const newImageSchema = z.object({
  type: z.literal('new'),
  file: z.instanceof(File, {
    message: 'Tệp phải là một đối tượng File hợp lệ',
  }),
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
    { message: 'Yêu cầu tối thiểu 1 hình ảnh' },
  )
  .refine(
    (images) => images.filter((img) => img.type !== 'deleted').length <= 200,
    { message: 'Cho phép tối đa 200 hình ảnh' },
  );

const formSchema = z.object({
  images: imagesSchema,
  coverIndex: z.number().int().nonnegative().nullable(),
});
```

Khởi tạo Form:

```ts
const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    images: [],
    coverIndex: null,
  },
});
```

Khi tải ảnh từ API về, chuyển đổi phản hồi thành `ExistingImage[]` và đặt lại trạng thái form (reset):

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

Nếu API trả về ID của ảnh bìa đã lưu (ví dụ `coverImageId`), ánh xạ `coverIndex` tương ứng:

```ts
form.reset({
  images: toExistingPayloads(cachedImages),
  coverIndex: cachedImages.findIndex((image) => image.id === coverImageId),
});
```

Nếu `findIndex` trả về `-1`, hãy chuẩn hóa về `null`.

## Tải Dữ Liệu Ban Đầu (Initial Data Loading)

API:

```http
GET /api/v1/files/sortable-images/:ownerKey
```

Phản hồi mẫu:

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

Tải dữ liệu phía Frontend:

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

`ownerKey` dùng để định danh bucket/nhóm ảnh. Ví dụ trong bản demo sử dụng `demo-user`. Trong môi trường thực tế, nên dùng khóa định danh thực sự, ví dụ:

- `user:${userId}:gallery`
- `product:${productId}:images`
- `tenant:${tenantId}:post:${postId}:images`

## Gửi Dữ Liệu FormData (Submitting FormData)

API:

```http
POST /api/v1/files/sortable-images/:ownerKey
Content-Type: multipart/form-data
```

Các trường trong request:

- `items`: Chuỗi JSON đại diện cho các ảnh hoạt động theo đúng thứ tự cuối cùng.
- `coverIndex`: Số thứ tự tùy chọn chỉ định vị trí ảnh đại diện.
- `files`: Các tệp nhị phân đính kèm tương ứng theo thứ tự các phần tử có `{ type: "new" }`.

Ví dụ chuỗi `items`:

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

Xây dựng `FormData`:

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

Gửi yêu cầu:

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

Không được gán tiêu đề `Content-Type` thủ công khi gửi `FormData`; trình duyệt sẽ tự động thêm tiêu đề kèm chuỗi boundary thích hợp.

Sau khi API trả về danh sách đã lưu, hãy đặt lại (reset) form để tất cả các mục chuyển đổi thành `existing`:

```ts
const saved = (await response.json()) as SortableImageApiResponse;
const savedImages = toExistingImages(saved.images);

setExistingImages(savedImages);
form.reset({
  images: toExistingPayloads(savedImages),
});
```

## Lý Do Bắt Buộc Phải Reset Form

Ban đầu, một hình ảnh mới được thêm vào có trạng thái:

```ts
{
  type: ('new', file, tempId, order);
}
```

Sau khi lưu thành công trên backend, ảnh này đã trở thành một ảnh được lưu trữ cố định trên máy chủ:

```ts
{ type: 'existing', id: publicId, order }
```

Nếu không reset lại form, các lần gửi tiếp theo có thể vô tình tải lại tệp nhị phân tương tự hoặc làm mất đồng bộ giữa `tempId` tạm thời và `id` cố định trên máy chủ.

## Dịch Vụ Tái Sử Dụng Phía Backend (Reusable Backend Service)

Logic tải lên và sắp xếp cốt lõi được đóng gói trong `SortableImageUploadService`.

Service này hoàn toàn độc lập với Database và Redis. Nó nhận vào:

- `currentImages`: Danh sách hình ảnh hiện đang lưu trữ.
- `items`: Các mục dữ liệu JSON đã được phân tích cú pháp từ client gửi lên.
- `files`: Danh sách tệp nhị phân nhận được từ multipart request.
- Tùy chọn cấu hình bổ sung như thư mục lưu trữ (`uploadFolder`) và kích thước tệp tối đa (`maxImageSize`).

Service trả về `nextImages` với các tệp mới đã được tải lên và sắp xếp theo đúng thứ tự. Controller hoặc service gọi hàm sẽ quyết định nơi lưu trữ `nextImages` (PostgreSQL, Redis, S3, v.v.).

```ts
const nextImages = await this.sortableImageUploadService.buildNextImages({
  currentImages,
  rawItems: items,
  files,
  uploadFolder: 'products',
  maxImageSize: 10 * 1024 * 1024,
});
```

Kiểu dữ liệu đầu vào `currentImages`:

```ts
type SortableImageStoredItem = {
  id: string;
  src: string;
  alt: string;
  filePublicId?: string;
  path?: string;
};
```

Kết quả đầu ra `nextImages` cũng là `SortableImageStoredItem[]` tuân theo thứ tự do người dùng lựa chọn.

Ví dụ lưu dữ liệu vào PostgreSQL qua TypeORM:

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

Để inject service này vào một module khác:

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

## Checklist Dành Cho Môi Trường Production

- Thay thế `ownerKey = "demo-user"` bằng định danh thực tế (ví dụ: `user:${userId}:gallery`, `product:${productId}:images`).
- Luôn xác thực (authenticate) và phân quyền (authorize) yêu cầu trước khi chỉnh sửa hình ảnh gắn với một `ownerKey`.
- Xây dựng chiến lược dọn dẹp/xóa tệp vật lý khi ảnh bị xóa khỏi danh sách.
- Trong production, lưu trữ `nextImages` và thứ tự vào cơ sở dữ liệu quan hệ (PostgreSQL) thay vì chỉ lưu tạm trong Redis.
- Nếu sử dụng AWS S3 hoặc CDN, cấu hình S3 disk trong `FileModule` và trả về URL thông qua CDN.
- Xác thực chặt chẽ kích thước tệp và định dạng MIME ở cả frontend và backend.
- Luôn reset form sau mỗi lần lưu thành công để chuyển đổi trạng thái các mục từ `new` sang `existing`.
