import { CallHandler } from '@nestjs/common';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import 'reflect-metadata';
import {
  FileUploadInterceptor,
  FileUploadInterceptorOptions,
} from './file-upload.interceptor';

const mockStorage = {
  disk: jest.fn().mockReturnThis(),
  put: jest.fn(),
  exists: jest.fn(),
  config: { disks: { local: {} } },
};

const mockContext = (fileOrFiles: any) => ({
  switchToHttp: () => ({
    getRequest: () => fileOrFiles,
    getResponse: () => ({}),
  }),
});

const next: CallHandler = { handle: jest.fn(() => 'next') } as any;

const uploadedFile = (originalname: string, content: string) => {
  const path = join(mkdtempSync(join(tmpdir(), 'upload-')), originalname);
  const buffer = Buffer.from(content);
  writeFileSync(path, buffer);

  return {
    originalname,
    buffer,
    path,
    mimetype: 'text/plain',
    fieldname: 'file',
    encoding: '7bit',
    size: buffer.length,
  };
};

describe('FileUploadInterceptor', () => {
  let interceptor: FileUploadInterceptor;
  let storage: any;

  beforeEach(() => {
    storage = {
      ...mockStorage,
      config: { disks: { local: {} } },
      disk: jest.fn().mockReturnThis(),
      put: jest.fn(),
      exists: jest.fn().mockResolvedValue(false),
    };
    jest.clearAllMocks();
  });

  it('should upload a single file to default path', async () => {
    const options: FileUploadInterceptorOptions = {
      fieldName: 'file',
      disk: 'local',
    };
    interceptor = new FileUploadInterceptor(storage, options);
    (interceptor as any).upload = {
      single: () => (req: any, _res: any, cb: any) => {
        req.file = uploadedFile('a.txt', 'a');
        cb();
      },
    };
    const req: any = {};
    const ctx = mockContext(req) as any;
    await interceptor.intercept(ctx, next);
    expect(storage.disk).toHaveBeenCalledWith('local');
    expect(storage.put).toHaveBeenCalledWith(
      'a.txt',
      Buffer.from('a'),
      expect.any(Object),
    );
    expect(req.uploadedFile).toBeDefined();
  });

  it('should upload a file to a static uploadPath', async () => {
    const options: FileUploadInterceptorOptions = {
      fieldName: 'file',
      disk: 'local',
      uploadPath: 'avatars',
    };
    interceptor = new FileUploadInterceptor(storage, options);
    (interceptor as any).upload = {
      single: () => (req: any, _res: any, cb: any) => {
        req.file = uploadedFile('b.txt', 'b');
        cb();
      },
    };
    const req: any = {};
    const ctx = mockContext(req) as any;
    await interceptor.intercept(ctx, next);
    expect(storage.put).toHaveBeenCalledWith(
      'avatars/b.txt',
      Buffer.from('b'),
      expect.any(Object),
    );
  });

  it('should upload a file to a dynamic uploadPath (function)', async () => {
    const options: FileUploadInterceptorOptions = {
      fieldName: 'file',
      disk: 'local',
      uploadPath: jest.fn().mockResolvedValue('users/42'),
    };
    interceptor = new FileUploadInterceptor(storage, options);
    (interceptor as any).upload = {
      single: () => (req: any, _res: any, cb: any) => {
        req.file = uploadedFile('c.txt', 'c');
        cb();
      },
    };
    const req: any = {};
    const ctx = mockContext(req) as any;
    await interceptor.intercept(ctx, next);
    expect(options.uploadPath).toHaveBeenCalled();
    expect(storage.put).toHaveBeenCalledWith(
      'users/42/c.txt',
      Buffer.from('c'),
      expect.any(Object),
    );
  });

  it('should merge root and uploadPath', async () => {
    storage.config = { disks: { local: { root: 'base' } } };
    const options: FileUploadInterceptorOptions = {
      fieldName: 'file',
      disk: 'local',
      uploadPath: 'avatars',
    };
    interceptor = new FileUploadInterceptor(storage, options);
    (interceptor as any).upload = {
      single: () => (req: any, _res: any, cb: any) => {
        req.file = uploadedFile('d.txt', 'd');
        cb();
      },
    };
    const req: any = {};
    const ctx = mockContext(req) as any;
    await interceptor.intercept(ctx, next);
    expect(storage.put).toHaveBeenCalledWith(
      'base/avatars/d.txt',
      Buffer.from('d'),
      expect.any(Object),
    );
  });

  it('should use per-upload filenameGenerator if provided', async () => {
    const options: FileUploadInterceptorOptions = {
      fieldName: 'file',
      disk: 'local',
      filenameGenerator: jest.fn().mockResolvedValue('custom.txt'),
    };
    interceptor = new FileUploadInterceptor(storage, options);
    (interceptor as any).upload = {
      single: () => (req: any, _res: any, cb: any) => {
        req.file = uploadedFile('e.txt', 'e');
        cb();
      },
    };
    const req: any = {};
    const ctx = mockContext(req) as any;
    await interceptor.intercept(ctx, next);
    expect(options.filenameGenerator).toHaveBeenCalled();
    expect(storage.put).toHaveBeenCalledWith(
      'custom.txt',
      Buffer.from('e'),
      expect.any(Object),
    );
  });

  it('should use global filenameGenerator if per-upload is not provided', async () => {
    const globalFilenameGenerator = jest.fn().mockResolvedValue('global.txt');
    storage.config = {
      disks: { local: {} },
      filenameGenerator: globalFilenameGenerator,
    };
    const options: FileUploadInterceptorOptions = {
      fieldName: 'file',
      disk: 'local',
    };
    interceptor = new FileUploadInterceptor(storage, options);
    (interceptor as any).upload = {
      single: () => (req: any, _res: any, cb: any) => {
        req.file = uploadedFile('f.txt', 'f');
        cb();
      },
    };
    const req: any = {};
    const ctx = mockContext(req) as any;
    await interceptor.intercept(ctx, next);
    expect(globalFilenameGenerator).toHaveBeenCalled();
    expect(storage.put).toHaveBeenCalledWith(
      'global.txt',
      Buffer.from('f'),
      expect.any(Object),
    );
  });

  it('should use default logic if no filenameGenerator is provided', async () => {
    const options: FileUploadInterceptorOptions = {
      fieldName: 'file',
      disk: 'local',
    };
    interceptor = new FileUploadInterceptor(storage, options);
    (interceptor as any).upload = {
      single: () => (req: any, _res: any, cb: any) => {
        req.file = uploadedFile('g.txt', 'g');
        cb();
      },
    };
    const req: any = {};
    const ctx = mockContext(req) as any;
    await interceptor.intercept(ctx, next);
    expect(storage.put).toHaveBeenCalledWith(
      'g.txt',
      Buffer.from('g'),
      expect.any(Object),
    );
  });

  it('should upload multiple files', async () => {
    const options: FileUploadInterceptorOptions = {
      fieldName: 'files',
      disk: 'local',
      isArray: true,
    };
    interceptor = new FileUploadInterceptor(storage, options);
    (interceptor as any).upload = {
      array: () => (req: any, _res: any, cb: any) => {
        req.files = [uploadedFile('h.txt', 'h'), uploadedFile('i.txt', 'i')];
        cb();
      },
    };
    const req: any = {};
    const ctx = mockContext(req) as any;
    await interceptor.intercept(ctx, next);
    expect(storage.put).toHaveBeenCalledTimes(2);
    expect(req.uploadedFiles.length).toBe(2);
  });

  it('should continue if no file uploaded', async () => {
    const options: FileUploadInterceptorOptions = {
      fieldName: 'file',
      disk: 'local',
    };
    interceptor = new FileUploadInterceptor(storage, options);
    (interceptor as any).upload = {
      single: () => (req: any, _res: any, cb: any) => {
        cb();
      },
    };
    const req: any = {};
    const ctx = mockContext(req) as any;
    await expect(interceptor.intercept(ctx, next)).resolves.toBe('next');
  });
});
