# Kiến Trúc Tải Tệp Nền (Background File Upload)

> [English](BACKGROUND_FILE_UPLOAD.md) | **Tiếng Việt**

Tài liệu này mô tả kiến trúc tải tệp chạy ngầm được thiết kế để xử lý việc tải lên số lượng lớn tệp (ví dụ: Bộ sưu tập bài viết, Thư viện hình ảnh, Nhập dữ liệu hàng loạt,...).

## 1. Đặt Vấn Đề

Khi client cần tải lên 10, 50 hoặc 100 hình ảnh cùng lúc:

- Việc xử lý tải lên đồng bộ trực tiếp trong chu trình HTTP request làm quá tải bộ nhớ RAM máy chủ (do lưu giữ toàn bộ tệp trong Buffer) và làm chậm thời gian phản hồi, dễ dẫn đến timeout gateway.
- Việc gắn chặt các service nghiệp vụ (ví dụ: Post, Gallery) với module lưu trữ làm mã nguồn bị phụ thuộc chéo và khó bảo trì.

## 2. Kiến Trúc Giải Pháp

Hệ thống kết hợp giữa **BullMQ** (xử lý tác vụ hàng đợi nền) và **EventEmitter** (mô hình Pub/Sub), tách biệt hoàn toàn module nghiệp vụ khỏi quá trình xử lý tệp.

```mermaid
sequenceDiagram
    participant Client
    participant Controller (ví dụ: Post)
    participant FileQueue (BullMQ)
    participant FileProcessor
    participant Storage (S3/Disk)
    participant Event Emitter
    participant DB Listener (PostService)

    Client->>Controller (ví dụ: Post): POST /images (multipart)
    Note over Controller (ví dụ: Post): Multer lưu tệp tạm vào ổ đĩa (diskStorage)
    Controller (ví dụ: Post)->>FileQueue (BullMQ): queueFileUpload(filePath, metadata, callbackEvent)
    Controller (ví dụ: Post)-->>Client: 202 Accepted (Đang xử lý trong nền)

    FileQueue (BullMQ)->>FileProcessor: Phân phối Job
    FileProcessor->>Storage (S3/Disk): Tải lên từ đường dẫn tạm
    Storage (S3/Disk)-->>FileProcessor: Trả về public URL
    Note over FileProcessor: Xóa tệp tạm khỏi ổ đĩa

    FileProcessor->>Event Emitter: emit(callbackEvent, fileInfo, metadata)
    Event Emitter->>DB Listener (PostService): Kích hoạt listener
    DB Listener (PostService)->>DB Listener (PostService): UPDATE/INSERT vào Database
```

## 3. Hướng Dẫn Tích Hợp

Để tích hợp tính năng tải tệp nền vào một tính năng mới, thực hiện theo 2 bước:

### Bước 1: Tiếp Nhận Request và Đẩy Vào Hàng Đợi (Queue)

Trong Controller của bạn, sử dụng **`diskStorage`** với Multer để ghi luồng tệp tới thư mục tạm trên ổ cứng (tránh dùng `memoryStorage`), sau đó đẩy job vào queue bằng `FileQueueService`.

```typescript
import {
  Controller,
  Post,
  Param,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { FileQueueService } from '@/api/file/file-queue.service';

@Controller('posts')
export class PostController {
  constructor(private readonly fileQueueService: FileQueueService) {}

  @Post(':id/gallery')
  @UseInterceptors(
    FilesInterceptor('files', 50, {
      storage: diskStorage({
        destination: '/tmp/uploads',
        filename: (req, file, cb) =>
          cb(null, `${uuidv4()}${extname(file.originalname)}`),
      }),
    }),
  )
  async uploadGallery(
    @Param('id') postId: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    for (const file of files) {
      await this.fileQueueService.queueFileUpload({
        filePath: file.path,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        destinationPath: `posts/${postId}/gallery`, // Thư mục đích trên Storage/S3

        // Điểm mấu chốt: chỉ định event được emit khi tải lên thành công
        callbackEventName: 'post.gallery.uploaded',

        // Metadata cần thiết để lưu hoặc liên kết trong database sau này
        metadata: { postId },
      });
    }

    return { message: 'Files are being processed in the background.' };
  }
}
```

### Bước 2: Lắng Nghe Sự Kiện và Cập Nhật Database

Trong domain service của bạn (ví dụ: `PostService`), đăng ký listener `@OnEvent()` tương ứng với `callbackEventName` đã cung cấp ở trên.

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FileEntity } from '@/api/file/entities/file.entity';

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);

  @OnEvent('post.gallery.uploaded')
  async handleGalleryImageUploaded(payload: {
    jobId: string;
    file: FileEntity;
    metadata: any;
  }) {
    const { postId } = payload.metadata;
    const fileUrl = payload.file.path; // URL sau khi tải lên hoàn tất

    this.logger.log(`Received uploaded image for post ${postId}: ${fileUrl}`);

    // Lưu URL/bản ghi vào Database tại đây:
    // await this.galleryRepo.save({ postId, imageUrl: fileUrl });
  }
}
```

---

## 4. Lưu Ý Vận Hành

- Cần đảm bảo có cronjob định kỳ dọn dẹp các thư mục tải lên tạm thời (`/tmp/uploads`) đề phòng trường hợp tiến trình bị tắt đột ngột trước khi `FileProcessor` kịp xóa tệp tạm. Trong điều kiện bình thường, `FileProcessor` sẽ tự động dọn sạch tệp tạm sau khi job hoàn thành.
- Mức độ đồng thời (concurrency) xử lý tệp được cấu hình qua decorator `@Processor()` trong `FileProcessor`. Hãy điều chỉnh mức độ đồng thời dựa trên năng lực của máy chủ (CPU/Disk I/O).
