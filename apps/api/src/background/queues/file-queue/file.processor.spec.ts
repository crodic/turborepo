import { FileService } from '@/api/file/file.service';
import { IFileUploadJob } from '@/common/interfaces/job.interface';
import { JobName } from '@/constants/job.constant';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import * as fsPromises from 'fs/promises';
import { FileProcessor } from './file.processor';

jest.mock('fs/promises');

describe('FileProcessor', () => {
  let processor: FileProcessor;
  let fileServiceMock: any;
  let eventEmitterMock: any;

  beforeEach(async () => {
    fileServiceMock = {
      uploadFile: jest
        .fn()
        .mockResolvedValue({ id: 1, path: 's3/path/test.png' }),
    };

    eventEmitterMock = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileProcessor,
        {
          provide: FileService,
          useValue: fileServiceMock,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitterMock,
        },
      ],
    }).compile();

    processor = module.get<FileProcessor>(FileProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should throw error for unsupported job type', async () => {
      const job = { name: 'unknown-job' } as any;
      await expect(processor.process(job)).rejects.toThrow(
        'Unsupported job type: unknown-job',
      );
    });

    it('should handle file upload and emit event', async () => {
      (fsPromises.readFile as jest.Mock).mockResolvedValue(Buffer.from('test'));
      (fsPromises.rm as jest.Mock).mockResolvedValue(undefined);

      const job: Job<IFileUploadJob> = {
        id: 'job-123',
        name: JobName.FILE_UPLOAD,
        data: {
          filePath: '/tmp/test.png',
          originalName: 'test.png',
          mimetype: 'image/png',
          size: 4,
          destinationPath: 'posts/1',
          callbackEventName: 'post.image.uploaded',
          metadata: { postId: 1 },
        },
      } as any;

      const result = await processor.process(job);
      const parsedResult = JSON.parse(result);

      expect(fsPromises.readFile).toHaveBeenCalledWith('/tmp/test.png');
      expect(fileServiceMock.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          originalname: 'test.png',
          buffer: expect.any(Buffer),
        }),
        { folder: 'posts/1' },
      );

      expect(fsPromises.rm).toHaveBeenCalledWith('/tmp/test.png', {
        force: true,
      });

      expect(eventEmitterMock.emit).toHaveBeenCalledWith(
        'post.image.uploaded',
        {
          jobId: 'job-123',
          file: { id: 1, path: 's3/path/test.png' },
          metadata: { postId: 1 },
        },
      );

      expect(parsedResult.path).toBe('s3/path/test.png');
      expect(parsedResult.originalName).toBe('test.png');
    });

    it('should not emit event if callbackEventName is not provided', async () => {
      (fsPromises.readFile as jest.Mock).mockResolvedValue(Buffer.from('test'));
      (fsPromises.rm as jest.Mock).mockResolvedValue(undefined);

      const job: Job<IFileUploadJob> = {
        id: 'job-123',
        name: JobName.FILE_UPLOAD,
        data: {
          filePath: '/tmp/test.png',
          originalName: 'test.png',
          mimetype: 'image/png',
          size: 4,
          destinationPath: 'posts/1',
        },
      } as any;

      await processor.process(job);

      expect(eventEmitterMock.emit).not.toHaveBeenCalled();
    });
  });
});
