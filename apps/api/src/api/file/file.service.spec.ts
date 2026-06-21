import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileEntity } from './entities/file.entity';
import { FileService } from './file.service';
import { FileValidator } from './validators/file.validator';

describe('FileService', () => {
  let service: FileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,

        // Mock repository
        {
          provide: getRepositoryToken(FileEntity),
          useValue: {
            findOneByOrFail: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },

        // Mock validator
        {
          provide: FileValidator,
          useValue: { validateImage: jest.fn(), validateFile: jest.fn() },
        },

        {
          provide: 'FILE_STORAGE_DISK_PUBLIC',
          useValue: {
            getDiskRoot: jest.fn().mockReturnValue('storage/public'),
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
});
