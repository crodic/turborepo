import { FileStorageService } from '@/libs/filesystem/lib/file-storage.service';
import { ImageTransformer } from '@/utils/transformers/image.transformer';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { FileEntity } from './entities/file.entity';
import { FileStreamService } from './file-stream.service';
import { TransformationParser } from './parsers/transformation.parser';

describe('FileStreamService', () => {
  let service: FileStreamService;
  let repository: {
    findOneByOrFail: jest.Mock;
  };
  let diskRoot: string;
  let disk: {
    get: jest.Mock;
    exists: jest.Mock;
    createReadStream: jest.Mock;
  };
  let storageService: {
    config: { default: string };
    disk: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findOneByOrFail: jest.fn(),
    };
    disk = {
      get: jest.fn(),
      exists: jest.fn().mockResolvedValue(true),
      createReadStream: jest.fn(),
    };
    storageService = {
      config: { default: 'public' },
      disk: jest.fn(() => disk),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileStreamService,
        {
          provide: getRepositoryToken(FileEntity),
          useValue: repository,
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

    service = module.get<FileStreamService>(FileStreamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
});
