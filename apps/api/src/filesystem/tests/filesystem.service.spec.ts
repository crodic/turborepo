import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { LocalDriver } from '../drivers/local.driver';
import { PublicDriver } from '../drivers/public.driver';
import { S3Driver } from '../drivers/s3.driver';
import { FilesystemService } from '../filesystem.service';

describe('FilesystemService', () => {
  let service: FilesystemService;
  const testRoot = 'storage_test_service';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesystemService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'storage.disk') return 'public';
              if (key === 'storage.localRoot') return testRoot;
              if (key === 'app.url') return 'http://localhost:3000';
              return undefined;
            }),
            getOrThrow: jest.fn((key: string) => {
              if (key === 'storage.s3') {
                return {
                  accessKeyId: 'test-key',
                  secretAccessKey: 'test-secret',
                  region: 'us-east-1',
                  bucket: 'test-bucket',
                };
              }
              throw new Error(`Missing key: ${key}`);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<FilesystemService>(FilesystemService);
  });

  afterAll(async () => {
    const fullTestDir = path.resolve(process.cwd(), testRoot);
    await fs.rm(fullTestDir, { recursive: true, force: true });
  });

  it('should return default PublicDriver when no disk name provided', () => {
    const disk = service.disk();
    expect(disk).toBeInstanceOf(PublicDriver);
  });

  it('should return LocalDriver for disk("local")', () => {
    const disk = service.disk('local');
    expect(disk).toBeInstanceOf(LocalDriver);
  });

  it('should return S3Driver for disk("s3")', () => {
    const disk = service.disk('s3');
    expect(disk).toBeInstanceOf(S3Driver);
  });

  it('should cache created drivers', () => {
    const disk1 = service.disk('public');
    const disk2 = service.disk('public');
    expect(disk1).toBe(disk2);
  });

  it('should execute facade put and get methods on default disk', async () => {
    await service.put('facade.txt', 'hello facade');
    expect(await service.exists('facade.txt')).toBe(true);

    const content = await service.get('facade.txt');
    expect(content.toString('utf-8')).toBe('hello facade');

    const url = service.url('facade.txt');
    expect(url).toBe('http://localhost:3000/storage/facade.txt');
  });
});
