import { FileStorageService } from '@/libs/filesystem/lib/file-storage.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileEntity } from './entities/file.entity';
import { FileFolderService } from './file-folder.service';

describe('FileFolderService', () => {
  let service: FileFolderService;
  let repository: {
    count: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let disk: {
    delete: jest.Mock;
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
    repository = {
      count: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    disk = {
      delete: jest.fn(),
    };
    storageService = {
      config: { default: 'public' },
      disk: jest.fn(() => disk),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileFolderService,
        {
          provide: getRepositoryToken(FileEntity),
          useValue: repository,
        },
        {
          provide: FileStorageService,
          useValue: storageService,
        },
      ],
    }).compile();

    service = module.get<FileFolderService>(FileFolderService);
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
});
