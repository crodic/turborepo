import { FileStorageService } from '@/libs/filesystem/lib/file-storage.service';
import { ImageTransformer } from '@/utils/transformers/image.transformer';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { pipeline } from 'stream/promises';
import { FileEntity } from './entities/file.entity';
import { FileService } from './file.service';
import { TransformationParser } from './parsers/transformation.parser';
import { FileValidator } from './validators/file.validator';

describe('FileService', () => {
  let service: FileService;
  let repository: {
    findOneByOrFail: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let diskRoot = 'storage/public';
  let disk: {
    getDiskRoot: jest.Mock;
    put: jest.Mock;
    putStream: jest.Mock;
    get: jest.Mock;
    delete: jest.Mock;
    exists: jest.Mock;
    createReadStream: jest.Mock;
  };
  let storageService: {
    config: { default: string };
    disk: jest.Mock;
  };

  const createQueryBuilderMock = (
    overrides: Record<string, jest.Mock> = {},
  ) => {
    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
      getRawMany: jest.fn().mockResolvedValue([]),
      ...overrides,
    };

    return qb;
  };

  beforeEach(async () => {
    diskRoot = 'storage/public';
    repository = {
      findOneByOrFail: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    disk = {
      getDiskRoot: jest.fn(() => diskRoot),
      put: jest.fn(async (path: string, content: Buffer) => {
        const target = join(diskRoot, path);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, content);
      }),
      putStream: jest.fn(
        async (path: string, stream: NodeJS.ReadableStream) => {
          const target = join(diskRoot, path);
          await mkdir(dirname(target), { recursive: true });
          await pipeline(stream, createWriteStream(target));
        },
      ),
      get: jest.fn((path: string) => readFile(join(diskRoot, path))),
      delete: jest.fn(),
      exists: jest.fn(async (path: string) => {
        try {
          await readFile(join(diskRoot, path));
          return true;
        } catch {
          return false;
        }
      }),
      createReadStream: jest.fn((path: string) =>
        createReadStream(join(diskRoot, path)),
      ),
    };
    storageService = {
      config: { default: 'public' },
      disk: jest.fn(() => disk),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,

        // Mock repository
        {
          provide: getRepositoryToken(FileEntity),
          useValue: repository,
        },

        // Mock validator
        {
          provide: FileValidator,
          useValue: { validateImage: jest.fn(), validateFile: jest.fn() },
        },

        {
          provide: FileStorageService,
          useValue: storageService,
        },
        {
          provide: TransformationParser,
          useValue: { parse: jest.fn(() => ({ width: 120, format: 'webp' })) },
        },
        {
          provide: ImageTransformer,
          useValue: {
            transform: jest.fn(async () => ({
              buffer: Buffer.from('transformed'),
              format: 'webp',
              size: 11,
            })),
          },
        },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns folder summaries with numeric count and size', async () => {
    repository.createQueryBuilder.mockReturnValue(
      createQueryBuilderMock({
        getRawMany: jest.fn().mockResolvedValue([
          { folder: 'avatars', count: '2', size: '4096' },
          { folder: 'docs', count: '1', size: '512' },
        ]),
      }),
    );

    await expect(service.listFolders()).resolves.toEqual([
      { folder: 'avatars', count: 2, size: 4096 },
      { folder: 'docs', count: 1, size: 512 },
    ]);
  });

  it('updates file folder and status by public id', async () => {
    const file = {
      id: '1',
      public_id: 'abc',
      folder: 'old',
      original_name: 'image.png',
      path: 'image/old/abc.png',
      hash: 'hash',
      mime: 'image/png',
      size: 100,
      width: 10,
      height: 10,
      duration: null,
      resource_type: 'image',
      status: 'active',
      url: 'http://localhost/storage/uploads/image/abc.png',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    repository.findOneByOrFail.mockResolvedValue(file);
    repository.save.mockImplementation(async (value) => value);

    const result = await service.update('abc', {
      folder: ' new-folder ',
      status: 'archived',
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ folder: 'new-folder', status: 'archived' }),
    );
    expect(result).toEqual(
      expect.objectContaining({ public_id: 'abc', folder: 'new-folder' }),
    );
  });

  it('rejects nested folder names when updating metadata', async () => {
    repository.findOneByOrFail.mockResolvedValue({
      id: '1',
      public_id: 'abc',
      folder: null,
      original_name: 'image.png',
      path: 'image/abc.png',
      hash: 'hash',
      mime: 'image/png',
      size: 100,
      width: 10,
      height: 10,
      duration: null,
      resource_type: 'image',
      status: 'active',
      url: 'http://localhost/storage/uploads/image/abc.png',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.update('abc', { folder: 'Video 1/raw' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('renames a folder with a bulk update', async () => {
    const qb = createQueryBuilderMock();
    repository.count.mockResolvedValue(3);
    repository.createQueryBuilder.mockReturnValueOnce(qb).mockReturnValueOnce(
      createQueryBuilderMock({
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ folder: 'new', count: '3', size: '1200' }]),
      }),
    );

    await expect(service.renameFolder('old', 'new')).resolves.toEqual({
      folder: 'new',
      count: 3,
      size: 1200,
    });
    expect(qb.update).toHaveBeenCalledWith(FileEntity);
    expect(qb.set).toHaveBeenCalledWith({ folder: 'new' });
    expect(qb.where).toHaveBeenCalledWith('folder = :folder', {
      folder: 'old',
    });
  });

  it('throws when renaming a missing folder', async () => {
    repository.count.mockResolvedValue(0);

    await expect(service.renameFolder('missing', 'new')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects path traversal folder names', async () => {
    expect(() => service.createFolder('../private')).toThrow(
      BadRequestException,
    );
  });

  it('rejects deleting a non-empty folder', async () => {
    repository.find.mockResolvedValue([{ path: 'storage/public/a.png' }]);

    await expect(service.deleteFolder('avatars')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deletes files inside a folder when requested', async () => {
    repository.find.mockResolvedValue([
      { path: 'storage/public/a.png' },
      { path: 'storage/public/b.png' },
    ]);

    await expect(service.deleteFolder('avatars', true)).resolves.toEqual({
      message: 'Successfully deleted',
    });
    expect(repository.delete).toHaveBeenCalledWith({ folder: 'avatars' });
  });

  it('deletes the database record when the stored file is already missing', async () => {
    repository.findOneByOrFail.mockResolvedValue({
      public_id: 'missing-file',
      path: 'image/missing-file.png',
      disk: 'public',
    });
    disk.exists.mockResolvedValue(false);

    await expect(service.delete('missing-file')).resolves.toEqual({
      message: 'Successfully deleted',
    });
    expect(disk.delete).not.toHaveBeenCalled();
    expect(repository.delete).toHaveBeenCalledWith({
      public_id: 'missing-file',
    });
  });

  it('stores managed media on the configured default disk', async () => {
    storageService.config.default = 'local';
    repository.create.mockImplementation((value) => value);
    repository.save.mockImplementation(async (value) => ({
      id: '1',
      url: 'http://localhost/storage/uploads/image/public-id.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...value,
    }));

    await service.upload({
      originalname: 'photo.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
      size: 4,
    } as Express.Multer.File);

    expect(storageService.disk).toHaveBeenCalledWith('local');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        disk: 'local',
        path: expect.stringMatching(/^image\/.+\.jpg$/),
      }),
    );
  });

  it('transforms an image from storage', async () => {
    diskRoot = await mkdtemp(join(tmpdir(), 'file-service-transform-'));
    await mkdir(join(diskRoot, 'image'), { recursive: true });
    await writeFile(join(diskRoot, 'image/abc.jpg'), Buffer.from('original'));
    repository.findOneByOrFail.mockResolvedValue({
      id: '1',
      public_id: 'abc',
      folder: null,
      original_name: 'photo.jpg',
      path: 'image/abc.jpg',
      hash: 'hash',
      mime: 'image/jpeg',
      size: 8,
      width: 10,
      height: 10,
      duration: null,
      resource_type: 'image',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      await expect(
        service.transform('image', 'w_120,f_webp', 'abc', 'jpg'),
      ).resolves.toEqual({
        buffer: Buffer.from('transformed'),
        mime: 'image/webp',
        size: 11,
      });
      expect(disk.get).toHaveBeenCalledWith('image/abc.jpg');
    } finally {
      await rm(diskRoot, { recursive: true, force: true });
    }
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
