import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { FileEntity } from './entities/file.entity';
import { FileService } from './file.service';
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
          provide: 'FILE_STORAGE_DISK_PUBLIC',
          useValue: {
            getDiskRoot: jest.fn(() => diskRoot),
            put: jest.fn(),
            delete: jest.fn(),
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
          mime: 'text/plain',
          size: 11,
          resource_type: 'raw',
        }),
      );
      await expect(readFile(result.path, 'utf8')).resolves.toBe('hello world');
    } finally {
      await rm(diskRoot, { recursive: true, force: true });
    }
  });
});
