import { Reflector } from '@nestjs/core';
import {
  FILE_UPLOAD_OPTIONS_KEY,
  FileResponse,
  FILES_UPLOAD_OPTIONS_KEY,
  getDiskToken,
  InjectDisk,
  UploadFile,
  UploadFiles,
} from '../decorators';
import type { FileUploadInterceptorOptions } from '../types/upload-options.type';

describe('Upload Decorators', () => {
  const reflector = new Reflector();

  it('should attach metadata for @UploadFile', () => {
    class TestController {
      @UploadFile('avatar', { disk: 'public', uploadPath: 'avatars' })
      testMethod(): boolean {
        return true;
      }
    }

    const metadata = reflector.get<FileUploadInterceptorOptions>(
      FILE_UPLOAD_OPTIONS_KEY,
      TestController.prototype.testMethod,
    );

    expect(metadata).toEqual({
      fieldName: 'avatar',
      disk: 'public',
      uploadPath: 'avatars',
      isArray: false,
    });
  });

  it('should attach metadata for @UploadFiles', () => {
    class TestController {
      @UploadFiles('photos', { disk: 's3', maxCount: 5 })
      testMethod(): boolean {
        return true;
      }
    }

    const metadata = reflector.get<FileUploadInterceptorOptions>(
      FILES_UPLOAD_OPTIONS_KEY,
      TestController.prototype.testMethod,
    );

    expect(metadata).toEqual({
      fieldName: 'photos',
      disk: 's3',
      maxCount: 5,
      isArray: true,
    });
  });

  it('should generate disk token correctly with getDiskToken', () => {
    expect(getDiskToken('local')).toBe('STORAGE_DISK_LOCAL');
    expect(getDiskToken('public')).toBe('STORAGE_DISK_PUBLIC');
    expect(getDiskToken('s3')).toBe('STORAGE_DISK_S3');
  });

  it('should create @InjectDisk decorator parameter', () => {
    class TestConsumer {
      constructor(@InjectDisk('public') public readonly disk: any) {}
    }
    expect(TestConsumer).toBeDefined();
  });

  it('should wrap method with @FileResponse', () => {
    class TestController {
      @FileResponse('public')
      async getFile(): Promise<string> {
        await Promise.resolve();
        return 'done';
      }
    }
    expect(TestController.prototype.getFile).toBeDefined();
  });
});
