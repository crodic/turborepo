import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import { FileCleanupService } from './file-cleanup.service';

jest.mock('fs');
jest.mock('fs/promises');

describe('FileCleanupService', () => {
  let service: FileCleanupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileCleanupService],
    }).compile();

    service = module.get<FileCleanupService>(FileCleanupService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleTempFilesCleanup', () => {
    it('should skip if directory does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await service.handleTempFilesCleanup();

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fsPromises.readdir).not.toHaveBeenCalled();
    });

    it('should delete old files and skip new files', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      (fsPromises.readdir as jest.Mock).mockResolvedValue([
        'old.png',
        'new.png',
        'dir',
      ]);

      const now = Date.now();
      const mockStat = jest.fn((filePath: string) => {
        if (filePath.endsWith('old.png')) {
          return {
            isFile: () => true,
            mtimeMs: now - 25 * 60 * 60 * 1000, // 25 hours old
          };
        }
        if (filePath.endsWith('new.png')) {
          return {
            isFile: () => true,
            mtimeMs: now - 23 * 60 * 60 * 1000, // 23 hours old
          };
        }
        return {
          isFile: () => false, // A directory
        };
      });

      (fsPromises.stat as jest.Mock).mockImplementation(mockStat);

      await service.handleTempFilesCleanup();

      expect(fsPromises.readdir).toHaveBeenCalled();
      expect(fsPromises.stat).toHaveBeenCalledTimes(6); // 3 items * 2 directories

      // Should have called rm only for old.png (twice, once for each dir)
      expect(fsPromises.rm).toHaveBeenCalledTimes(2);
      expect((fsPromises.rm as jest.Mock).mock.calls[0][0]).toMatch(
        /old\.png$/,
      );
    });
  });
});
