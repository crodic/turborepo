import { IFileUploadJob } from '@/common/interfaces/job.interface';
import { JobName, QueueName } from '@/constants/job.constant';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { FileQueueService } from './file-queue.service';

describe('FileQueueService', () => {
  let service: FileQueueService;
  let queueMock: any;

  beforeEach(async () => {
    queueMock = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileQueueService,
        {
          provide: getQueueToken(QueueName.FILE),
          useValue: queueMock,
        },
      ],
    }).compile();

    service = module.get<FileQueueService>(FileQueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('queueFileUpload', () => {
    it('should add a job to the queue', async () => {
      const payload: IFileUploadJob = {
        filePath: '/tmp/test.png',
        originalName: 'test.png',
        mimetype: 'image/png',
        size: 1024,
        destinationPath: 'posts/1',
      };

      await service.queueFileUpload(payload);

      expect(queueMock.add).toHaveBeenCalledWith(
        JobName.FILE_UPLOAD,
        payload,
        expect.objectContaining({
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        }),
      );
    });
  });
});
