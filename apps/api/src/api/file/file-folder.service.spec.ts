import { FilesystemService } from '@/filesystem/filesystem.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileFolderEntity } from './entities/file-folder.entity';
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
  let folderRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let disk: {
    delete: jest.Mock;
  };
  let storageService: {
    disk: jest.Mock;
  };

  const createQueryBuilderMock = (
    overrides: Record<string, jest.Mock> = {},
  ) => {
    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({ count: '0', size: '0' }),
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
    folderRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((val) => Promise.resolve(val)),
      create: jest.fn((val) => val),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    disk = {
      delete: jest.fn(),
    };
    storageService = {
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
          provide: getRepositoryToken(FileFolderEntity),
          useValue: folderRepository,
        },
        {
          provide: FilesystemService,
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
    folderRepository.createQueryBuilder.mockReturnValue(
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
    const qb = createQueryBuilderMock({
      getRawOne: jest.fn().mockResolvedValue({ count: '3', size: '1200' }),
    });
    folderRepository.findOne
      .mockResolvedValueOnce({ id: 1, name: 'old' })
      .mockResolvedValueOnce(null);
    repository.count.mockResolvedValue(3);
    repository.createQueryBuilder.mockReturnValue(qb);

    await expect(service.renameFolder('old', 'new')).resolves.toEqual({
      folder: 'new',
      count: 3,
      size: 1200,
    });
    expect(folderRepository.save).toHaveBeenCalledWith({ id: 1, name: 'new' });
    expect(qb.update).toHaveBeenCalledWith(FileEntity);
    expect(qb.set).toHaveBeenCalledWith({ folder: 'new' });
    expect(qb.where).toHaveBeenCalledWith('folder = :folder', {
      folder: 'old',
    });
  });

  it('throws when renaming a missing folder', async () => {
    folderRepository.findOne.mockResolvedValue(null);
    repository.count.mockResolvedValue(0);

    await expect(service.renameFolder('missing', 'new')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects path traversal folder names', async () => {
    await expect(service.createFolder('../private')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('creates an empty folder and persists to folderRepository', async () => {
    folderRepository.findOne.mockResolvedValue(null);
    repository.createQueryBuilder.mockReturnValue(
      createQueryBuilderMock({
        getRawOne: jest.fn().mockResolvedValue({ count: '0', size: '0' }),
      }),
    );

    await expect(service.createFolder('marketing')).resolves.toEqual({
      folder: 'marketing',
      count: 0,
      size: 0,
    });
    expect(folderRepository.save).toHaveBeenCalledWith({ name: 'marketing' });
  });

  it('throws BadRequestException when creating a duplicate folder', async () => {
    folderRepository.findOne.mockResolvedValue({ id: 1, name: 'marketing' });

    await expect(service.createFolder('marketing')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects deleting a non-empty folder', async () => {
    folderRepository.findOne.mockResolvedValue({ id: 1, name: 'avatars' });
    repository.find.mockResolvedValue([{ path: 'storage/public/a.png' }]);

    await expect(service.deleteFolder('avatars')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deletes files inside a folder when requested', async () => {
    folderRepository.findOne.mockResolvedValue({ id: 1, name: 'avatars' });
    repository.find.mockResolvedValue([
      { path: 'storage/public/a.png' },
      { path: 'storage/public/b.png' },
    ]);

    await expect(service.deleteFolder('avatars', true)).resolves.toEqual({
      message: 'Successfully deleted',
    });
    expect(repository.delete).toHaveBeenCalledWith({ folder: 'avatars' });
    expect(folderRepository.delete).toHaveBeenCalledWith({ id: 1 });
  });
});
