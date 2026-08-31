import process from 'node:process';
import storageConfig from './storage.config';

describe('StorageConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return default storage configuration when env is empty', async () => {
    delete process.env.FILESYSTEM_DISK;
    delete process.env.FILESYSTEM_LOCAL_ROOT;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_REGION;
    delete process.env.AWS_BUCKET;
    delete process.env.AWS_ENDPOINT;
    delete process.env.AWS_USE_PATH_STYLE_ENDPOINT;

    const config = await storageConfig();

    expect(config.disk).toBe('public');
    expect(config.localRoot).toBe('storage');
    expect(config.s3.region).toBe('us-east-1');
    expect(config.s3.bucket).toBe('nest-uploads');
    expect(config.s3.endpoint).toBeUndefined();
    expect(config.s3.forcePathStyle).toBe(false);
  });

  it('should load custom storage configuration from environment variables', async () => {
    process.env.FILESYSTEM_DISK = 's3';
    process.env.FILESYSTEM_LOCAL_ROOT = 'custom_storage';
    process.env.AWS_ACCESS_KEY_ID = 'test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    process.env.AWS_REGION = 'ap-southeast-1';
    process.env.AWS_BUCKET = 'my-bucket';
    process.env.AWS_ENDPOINT = 'http://localhost:9000';
    process.env.AWS_USE_PATH_STYLE_ENDPOINT = 'true';

    const config = await storageConfig();

    expect(config.disk).toBe('s3');
    expect(config.localRoot).toBe('custom_storage');
    expect(config.s3.accessKeyId).toBe('test-key');
    expect(config.s3.secretAccessKey).toBe('test-secret');
    expect(config.s3.region).toBe('ap-southeast-1');
    expect(config.s3.bucket).toBe('my-bucket');
    expect(config.s3.endpoint).toBe('http://localhost:9000');
    expect(config.s3.forcePathStyle).toBe(true);
  });

  it('should throw validation error on invalid disk value', async () => {
    process.env.FILESYSTEM_DISK = 'invalid_disk';

    await expect(async () => await storageConfig()).rejects.toThrow();
  });
});
