import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { Test, TestingModule } from '@nestjs/testing';
import { FileChunkUploadService } from './file-chunk-upload.service';
import { FileFolderService } from './file-folder.service';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { SortableImageCacheService } from './sortable-image-cache.service';

describe('FileController', () => {
  let controller: FileController;

  const mockFileService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    upload: jest.fn(),
    delete: jest.fn(),
    uploadImage: jest.fn(),
    uploadFile: jest.fn(),
  };

  const mockFileFolderService = {
    listFolders: jest.fn(),
    createFolder: jest.fn(),
    renameFolder: jest.fn(),
    deleteFolder: jest.fn(),
  };

  const mockFileChunkUploadService = {
    createUploadSession: jest.fn(),
    uploadChunk: jest.fn(),
    completeUploadSession: jest.fn(),
    abortUploadSession: jest.fn(),
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
          provide: FileFolderService,
          useValue: mockFileFolderService,
        },
        {
          provide: FileChunkUploadService,
          useValue: mockFileChunkUploadService,
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
