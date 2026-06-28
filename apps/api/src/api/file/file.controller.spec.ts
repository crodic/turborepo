import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { Test, TestingModule } from '@nestjs/testing';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { SortableImageCacheService } from './sortable-image-cache.service';

describe('FileController', () => {
  let controller: FileController;

  const mockFileService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    listFolders: jest.fn(),
    createFolder: jest.fn(),
    renameFolder: jest.fn(),
    deleteFolder: jest.fn(),
    upload: jest.fn(),
    delete: jest.fn(),
    uploadImage: jest.fn(),
    uploadImages: jest.fn(),
    uploadFile: jest.fn(),
  };

  const mockSortableImageCacheService = {
    findAll: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileController],
      providers: [
        {
          provide: FileService,
          useValue: mockFileService,
        },
        {
          provide: SortableImageCacheService,
          useValue: mockSortableImageCacheService,
        },
      ],
    })
      .overrideGuard(AdminAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(PoliciesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<FileController>(FileController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
