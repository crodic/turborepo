import { FilesystemService } from '@/filesystem/filesystem.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createWriteStream } from 'fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { pipeline } from 'stream/promises';
import { FileEntity } from './entities/file.entity';
import { FileChunkUploadService } from './file-chunk-upload.service';
import { FileFolderService } from './file-folder.service';

describe('FileChunkUploadService', () => {
  let service: FileChunkUploadService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let diskRoot: string;
  let disk: {
    put: jest.Mock;
  };
  let storageService: {
    disk: jest.Mock;
  };
  let fileFolderService: {
    normalizeFolder: jest.Mock;
    ensureFolder: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
    };
    disk = {
      put: jest.fn(
        async (
          path: string,
          content: Buffer | NodeJS.ReadableStream,
          _options?: any,
        ) => {
          const target = join(diskRoot, path);
          await mkdir(dirname(target), { recursive: true });
          if (content && typeof (content as any).pipe === 'function') {
            await pipeline(
              content as NodeJS.ReadableStream,
              createWriteStream(target),
            );
          } else {
            await writeFile(target, content as Buffer);
          }
        },
      ),
    };
    storageService = {
      disk: jest.fn(() => disk),
    };
    fileFolderService = {
      normalizeFolder: jest.fn((folder) => folder ?? null),
      ensureFolder: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileChunkUploadService,
        {
          provide: getRepositoryToken(FileEntity),
          useValue: repository,
        },
        {
          provide: FilesystemService,
          useValue: storageService,
        },
        {
          provide: FileFolderService,
          useValue: fileFolderService,
        },
      ],
    }).compile();

    service = module.get<FileChunkUploadService>(FileChunkUploadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('uploads chunks and merges them into a stored file', async () => {
    diskRoot = await mkdtemp(join(tmpdir(), 'file-service-'));
    repository.create.mockImplementation((value) => value);
    repository.save.mockImplementation(async (value) => ({
      id: '1',
      url: 'http://localhost/storage/uploads/raw/public-id.txt',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...value,
    }));

    try {
      const session = await service.createUploadSession({
        originalName: 'hello.txt',
        mime: 'text/plain',
        size: 11,
        folder: 'docs',
        chunkSize: 4,
        totalChunks: 3,
      });

      await service.uploadChunk(session.sessionId, 0, {
        buffer: Buffer.from('hell'),
        size: 4,
      } as Express.Multer.File);
      await service.uploadChunk(session.sessionId, 1, {
        buffer: Buffer.from('o wo'),
        size: 4,
      } as Express.Multer.File);
      await service.uploadChunk(session.sessionId, 2, {
        buffer: Buffer.from('rld'),
        size: 3,
      } as Express.Multer.File);

      const result = await service.completeUploadSession(session.sessionId);

      expect(result).toEqual(
        expect.objectContaining({
          original_name: 'hello.txt',
          folder: 'docs',
          disk: 'public',
          mime: 'text/plain',
          size: 11,
          resource_type: 'raw',
        }),
      );
      await expect(readFile(join(diskRoot, result.path), 'utf8')).resolves.toBe(
        'hello world',
      );
    } finally {
      await rm(diskRoot, { recursive: true, force: true });
    }
  });

  it('uploads chunks via S3 multipart when driver is multipart capable', async () => {
    const s3MultipartDisk = {
      createMultipartUpload: jest.fn().mockResolvedValue({
        uploadId: 's3-upload-123',
        key: 'raw/docs/test.txt',
      }),
      uploadPart: jest
        .fn()
        .mockResolvedValue({ etag: '"etag-1"', partNumber: 1 }),
      completeMultipartUpload: jest.fn().mockResolvedValue('raw/docs/test.txt'),
      abortMultipartUpload: jest.fn().mockResolvedValue(true),
    };

    storageService.disk.mockReturnValue(s3MultipartDisk as any);

    repository.create.mockImplementation((value) => value);
    repository.save.mockImplementation(async (value) => ({
      id: '10',
      ...value,
    }));

    const session = await service.createUploadSession({
      originalName: 'test.txt',
      mime: 'text/plain',
      size: 10,
      chunkSize: 10,
      totalChunks: 1,
      disk: 's3',
      folder: 'docs',
    });

    expect(s3MultipartDisk.createMultipartUpload).toHaveBeenCalled();

    await service.uploadChunk(session.sessionId, 0, {
      buffer: Buffer.from('helloworld'),
      size: 10,
    } as Express.Multer.File);

    expect(s3MultipartDisk.uploadPart).toHaveBeenCalledWith(
      expect.any(String),
      's3-upload-123',
      1,
      expect.any(Buffer),
    );

    const result = await service.completeUploadSession(session.sessionId);

    expect(s3MultipartDisk.completeMultipartUpload).toHaveBeenCalledWith(
      expect.any(String),
      's3-upload-123',
      [{ partNumber: 1, etag: '"etag-1"' }],
    );
    expect(result.disk).toBe('s3');
  });
});
