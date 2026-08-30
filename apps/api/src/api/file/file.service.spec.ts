import { FileStorageService } from '@/libs/filesystem/lib/file-storage.service';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { pipeline } from 'stream/promises';
import { FileEntity } from './entities/file.entity';
import { FileFolderService } from './file-folder.service';
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
  let fileFolderService: FileFolderService;

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
        FileFolderService,
        {
          provide: getRepositoryToken(FileEntity),
          useValue: repository,
        },
        {
          provide: FileValidator,
          useValue: { validateImage: jest.fn(), validateFile: jest.fn() },
        },
        {
          provide: FileStorageService,
          useValue: storageService,
        },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
    fileFolderService = module.get<FileFolderService>(FileFolderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(fileFolderService).toBeDefined();
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
});
