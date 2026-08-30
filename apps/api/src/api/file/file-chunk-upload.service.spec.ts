import { FileStorageService } from '@/libs/filesystem/lib/file-storage.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createWriteStream } from 'fs';
import { mkdir, mkdtemp, readFile, rm } from 'fs/promises';
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
    putStream: jest.Mock;
    put: jest.Mock;
  };
  let storageService: {
    config: { default: string };
    disk: jest.Mock;
  };
  let fileFolderService: {
    normalizeFolder: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
    };
    disk = {
      putStream: jest.fn(
        async (path: string, stream: NodeJS.ReadableStream) => {
          const target = join(diskRoot, path);
          await mkdir(dirname(target), { recursive: true });
          await pipeline(stream, createWriteStream(target));
        },
      ),
      put: jest.fn(),
    };
    storageService = {
      config: { default: 'public' },
      disk: jest.fn(() => disk),
    };
    fileFolderService = {
      normalizeFolder: jest.fn((folder) => folder ?? null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileChunkUploadService,
        {
          provide: getRepositoryToken(FileEntity),
          useValue: repository,
        },
        {
          provide: FileStorageService,
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
});
