import {
  BadRequestException,
  type CallHandler,
  type ExecutionContext,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { MulterError } from 'multer';
import { of } from 'rxjs';
import type { FilesystemService } from '../filesystem.service';
import { FileUploadInterceptor } from '../interceptors/file-upload.interceptor';

describe('FileUploadInterceptor', () => {
  let mockDisk: {
    put: jest.Mock;
    url: jest.Mock;
  };
  let mockFilesystemService: Partial<FilesystemService>;

  beforeEach(() => {
    mockDisk = {
      put: jest.fn().mockResolvedValue('avatars/123-avatar.png'),
      url: jest
        .fn()
        .mockReturnValue(
          'http://localhost:3000/storage/avatars/123-avatar.png',
        ),
    };
    mockFilesystemService = {
      disk: jest.fn().mockReturnValue(mockDisk),
    };
  });

  const createMockContext = (
    req: Partial<Request> = {},
    res: Partial<Response> = {},
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => req as Request,
        getResponse: () => res as Response,
      }),
    } as unknown as ExecutionContext;
  };

  const createMockNext = (): CallHandler => ({
    handle: () => of({ success: true }),
  });

  it('should pass through when no file is uploaded', async () => {
    const interceptor = new FileUploadInterceptor(
      mockFilesystemService as FilesystemService,
      {
        fieldName: 'avatar',
      },
    );

    const mockReq = {};
    const context = createMockContext(mockReq);
    const next = createMockNext();

    jest
      .spyOn<any, any>(interceptor, 'runMulter')
      .mockImplementation(async () => {
        await Promise.resolve();
      });

    const result = await interceptor.intercept(context, next);
    expect(result).toBeDefined();
    expect(mockDisk.put).not.toHaveBeenCalled();
  });

  it('should successfully upload a single file and attach to req.uploadedFile', async () => {
    const interceptor = new FileUploadInterceptor(
      mockFilesystemService as FilesystemService,
      {
        fieldName: 'avatar',
        disk: 'public',
        uploadPath: 'avatars',
        rules: [
          { type: 'type', allowedMimeTypes: ['image/png', 'image/jpeg'] },
          { type: 'size', maxSize: 5 * 1024 * 1024 },
        ],
      },
    );

    const mockFile: Express.Multer.File = {
      fieldname: 'avatar',
      originalname: 'avatar.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('fake image content'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const mockReq: any = { file: mockFile };
    const context = createMockContext(mockReq);
    const next = createMockNext();

    jest
      .spyOn<any, any>(interceptor, 'runMulter')
      .mockImplementation(async () => {
        await Promise.resolve();
      });

    await interceptor.intercept(context, next);

    expect(mockDisk.put).toHaveBeenCalledWith(
      expect.stringMatching(/^avatars\/.+\.png$/),
      mockFile.buffer,
      { mimeType: 'image/png', visibility: 'public' },
    );
    expect(mockReq.uploadedFile).toBeDefined();
    expect(mockReq.uploadedFile.originalName).toBe('avatar.png');
    expect(mockReq.uploadedFile.disk).toBe('public');
    expect(mockReq.uploadedFile.url).toBe(
      'http://localhost:3000/storage/avatars/123-avatar.png',
    );
  });

  it('should successfully upload multiple files and attach to req.uploadedFiles', async () => {
    const interceptor = new FileUploadInterceptor(
      mockFilesystemService as FilesystemService,
      {
        fieldName: 'photos',
        disk: 's3',
        isArray: true,
        maxCount: 3,
        uploadPath: 'gallery',
      },
    );

    const mockFiles: Express.Multer.File[] = [
      {
        fieldname: 'photos',
        originalname: 'p1.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 500,
        buffer: Buffer.from('photo 1'),
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      },
      {
        fieldname: 'photos',
        originalname: 'p2.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 600,
        buffer: Buffer.from('photo 2'),
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      },
    ];

    const mockReq: any = { files: mockFiles };
    const context = createMockContext(mockReq);
    const next = createMockNext();

    jest
      .spyOn<any, any>(interceptor, 'runMulter')
      .mockImplementation(async () => {
        await Promise.resolve();
      });

    await interceptor.intercept(context, next);

    expect(mockDisk.put).toHaveBeenCalledTimes(2);
    expect(mockReq.uploadedFiles).toHaveLength(2);
    expect(mockReq.uploadedFiles?.[0]?.originalName).toBe('p1.jpg');
    expect(mockReq.uploadedFiles?.[1]?.originalName).toBe('p2.jpg');
  });

  it('should support dynamic uploadPath and filenameGenerator functions', async () => {
    const interceptor = new FileUploadInterceptor(
      mockFilesystemService as FilesystemService,
      {
        fieldName: 'doc',
        filenameGenerator: (file) => `custom-${file.originalname}`,
        uploadPath: () => 'dynamic/folder',
      },
    );

    const mockFile: Express.Multer.File = {
      fieldname: 'doc',
      originalname: 'report.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1000,
      buffer: Buffer.from('pdf'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const mockReq: any = { file: mockFile };
    const context = createMockContext(mockReq);
    const next = createMockNext();

    jest
      .spyOn<any, any>(interceptor, 'runMulter')
      .mockImplementation(async () => {
        await Promise.resolve();
      });

    await interceptor.intercept(context, next);

    expect(mockDisk.put).toHaveBeenCalledWith(
      'dynamic/folder/custom-report.pdf',
      mockFile.buffer,
      expect.any(Object),
    );
  });

  it('should throw UnprocessableEntityException when MIME type is not allowed', async () => {
    const interceptor = new FileUploadInterceptor(
      mockFilesystemService as FilesystemService,
      {
        fieldName: 'avatar',
        rules: [
          { type: 'type', allowedMimeTypes: ['image/jpeg', 'image/png'] },
        ],
      },
    );

    const mockFile: Express.Multer.File = {
      fieldname: 'avatar',
      originalname: 'virus.exe',
      encoding: '7bit',
      mimetype: 'application/x-msdownload',
      size: 1024,
      buffer: Buffer.from('exe'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const mockReq: any = { file: mockFile };
    const context = createMockContext(mockReq);
    const next = createMockNext();

    jest
      .spyOn<any, any>(interceptor, 'runMulter')
      .mockImplementation(async () => {
        await Promise.resolve();
      });

    await expect(interceptor.intercept(context, next)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('should support wildcard MIME types like image/*', async () => {
    const interceptor = new FileUploadInterceptor(
      mockFilesystemService as FilesystemService,
      {
        fieldName: 'avatar',
        rules: [{ type: 'type', allowedMimeTypes: ['image/*'] }],
      },
    );

    const mockFile: Express.Multer.File = {
      fieldname: 'avatar',
      originalname: 'photo.webp',
      encoding: '7bit',
      mimetype: 'image/webp',
      size: 1024,
      buffer: Buffer.from('webp'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const mockReq: any = { file: mockFile };
    const context = createMockContext(mockReq);
    const next = createMockNext();

    jest
      .spyOn<any, any>(interceptor, 'runMulter')
      .mockImplementation(async () => {
        await Promise.resolve();
      });

    await expect(interceptor.intercept(context, next)).resolves.toBeDefined();
  });

  it('should throw UnprocessableEntityException when file size is too small or too large', async () => {
    const interceptor = new FileUploadInterceptor(
      mockFilesystemService as FilesystemService,
      {
        fieldName: 'avatar',
        rules: [{ type: 'size', minSize: 100, maxSize: 500 }],
      },
    );

    const tooSmallFile: Express.Multer.File = {
      fieldname: 'avatar',
      originalname: 'tiny.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: 50,
      buffer: Buffer.from('tiny'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const mockReq: any = { file: tooSmallFile };
    const context = createMockContext(mockReq);
    const next = createMockNext();

    jest
      .spyOn<any, any>(interceptor, 'runMulter')
      .mockImplementation(async () => {
        await Promise.resolve();
      });

    await expect(interceptor.intercept(context, next)).rejects.toThrow(
      /smaller than minimum required size of 100 bytes/,
    );
  });

  it('should validate custom rules', async () => {
    const interceptor = new FileUploadInterceptor(
      mockFilesystemService as FilesystemService,
      {
        fieldName: 'avatar',
        rules: [
          {
            type: 'custom',
            validate: (file) => file.originalname.startsWith('approved-'),
            message: 'File must start with approved-',
          },
        ],
      },
    );

    const mockFile: Express.Multer.File = {
      fieldname: 'avatar',
      originalname: 'unapproved.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: 200,
      buffer: Buffer.from('data'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const mockReq: any = { file: mockFile };
    const context = createMockContext(mockReq);
    const next = createMockNext();

    jest
      .spyOn<any, any>(interceptor, 'runMulter')
      .mockImplementation(async () => {
        await Promise.resolve();
      });

    await expect(interceptor.intercept(context, next)).rejects.toThrow(
      'File must start with approved-',
    );
  });

  it('should catch and rethrow MulterError as BadRequestException', async () => {
    const interceptor = new FileUploadInterceptor(
      mockFilesystemService as FilesystemService,
      {
        fieldName: 'avatar',
      },
    );

    const mockReq: any = {};
    const mockRes: any = {};

    jest
      .spyOn(
        (interceptor as unknown as { upload: { single: jest.Mock } }).upload,
        'single',
      )
      .mockReturnValue(((_req: any, _res: any, cb: any) => {
        cb(new MulterError('LIMIT_FILE_SIZE', 'avatar'));
      }) as any);

    await expect(
      (
        interceptor as unknown as {
          runMulter: (req: any, res: any) => Promise<void>;
        }
      ).runMulter(mockReq, mockRes),
    ).rejects.toThrow(BadRequestException);
  });
});
