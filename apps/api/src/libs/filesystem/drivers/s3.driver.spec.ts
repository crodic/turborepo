import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectAclCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectAclCommand,
  PutObjectCommand,
  PutObjectTaggingCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { S3DiskConfig } from '../lib/file-storage.interface';
import { S3StorageDriver } from './s3.driver';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('S3StorageDriver', () => {
  const config: S3DiskConfig = {
    driver: 's3',
    accessKeyId: 'access-key',
    secretAccessKey: 'secret-key',
    region: 'ap-southeast-1',
    endpoint: 'https://s3.ap-southeast-1.amazonaws.com',
    bucket: 'test-bucket',
    cdnBaseUrl: 'https://cdn.example.com',
    forcePathStyle: true,
  };

  let sendSpy: jest.SpyInstance;
  let driver: S3StorageDriver;

  const sentCommand = (index = 0) =>
    sendSpy.mock.calls[index][0] as { input: Record<string, unknown> };

  beforeEach(() => {
    sendSpy = jest
      .spyOn(S3Client.prototype as any, 'send')
      .mockResolvedValue({});
    (getSignedUrl as jest.Mock).mockReset();
    driver = new S3StorageDriver(config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uploads buffers with bucket, key, acl, and content type', async () => {
    const content = Buffer.from('hello');

    await driver.put('folder/file.txt', content, {
      visibility: 'public',
      ContentType: 'text/plain',
    });

    expect(sendSpy).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    expect(sentCommand().input).toEqual({
      Bucket: 'test-bucket',
      Key: 'folder/file.txt',
      Body: content,
      ACL: 'public-read',
      ContentType: 'text/plain',
    });
  });

  it('uploads streams without converting the body', async () => {
    const stream = Readable.from(['hello']);

    await driver.putStream('folder/file.txt', stream, {
      visibility: 'private',
    });

    expect(sendSpy).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    expect(sentCommand().input).toEqual(
      expect.objectContaining({
        Bucket: 'test-bucket',
        Key: 'folder/file.txt',
        Body: stream,
        ACL: 'private',
      }),
    );
  });

  it('changes visibility with PutObjectAclCommand without overwriting content', async () => {
    await driver.setVisibility('folder/file.txt', 'public');

    expect(sendSpy).toHaveBeenCalledWith(expect.any(PutObjectAclCommand));
    expect(sentCommand().input).toEqual({
      Bucket: 'test-bucket',
      Key: 'folder/file.txt',
      ACL: 'public-read',
    });
  });

  it('detects public visibility from grants', async () => {
    sendSpy.mockResolvedValueOnce({
      Grants: [
        {
          Permission: 'READ',
          Grantee: {
            URI: 'http://acs.amazonaws.com/groups/global/AllUsers',
          },
        },
      ],
    });

    await expect(driver.getVisibility('folder/file.txt')).resolves.toBe(
      'public',
    );
    expect(sendSpy).toHaveBeenCalledWith(expect.any(GetObjectAclCommand));
  });

  it('reads object bodies into a buffer', async () => {
    sendSpy.mockResolvedValueOnce({
      Body: Readable.from([Buffer.from('hello'), Buffer.from(' world')]),
    });

    await expect(driver.get('folder/file.txt')).resolves.toEqual(
      Buffer.from('hello world'),
    );
    expect(sendSpy).toHaveBeenCalledWith(expect.any(GetObjectCommand));
  });

  it('checks existence with HeadObjectCommand', async () => {
    await expect(driver.exists('folder/file.txt')).resolves.toBe(true);
    expect(sendSpy).toHaveBeenCalledWith(expect.any(HeadObjectCommand));

    sendSpy.mockRejectedValueOnce(new Error('not found'));
    await expect(driver.exists('missing.txt')).resolves.toBe(false);
  });

  it('copies and deletes objects with v3 commands', async () => {
    await driver.copy('source.txt', 'dest.txt');
    await driver.delete('source.txt');

    expect(sendSpy.mock.calls[0][0]).toBeInstanceOf(CopyObjectCommand);
    expect(sentCommand(0).input).toEqual({
      Bucket: 'test-bucket',
      CopySource: '/test-bucket/source.txt',
      Key: 'dest.txt',
    });
    expect(sendSpy.mock.calls[1][0]).toBeInstanceOf(DeleteObjectCommand);
    expect(sentCommand(1).input).toEqual({
      Bucket: 'test-bucket',
      Key: 'source.txt',
    });
  });

  it('generates signed URLs with the v3 presigner', async () => {
    (getSignedUrl as jest.Mock).mockResolvedValue('https://signed.example.com');

    await expect(driver.getTemporaryUrl('file.txt', 60)).resolves.toBe(
      'https://signed.example.com',
    );

    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.any(S3Client),
      expect.any(GetObjectCommand),
      { expiresIn: 60 },
    );
  });

  it('rejects unsupported signed URL restrictions', async () => {
    await expect(
      driver.getTemporaryUrl('file.txt', 60, { ip: '127.0.0.1' }),
    ).rejects.toThrow('IP/device restriction is not supported');
  });

  it('stores expiration tags for timed objects', async () => {
    const expiresAt = new Date('2026-06-19T00:00:00.000Z');

    await driver.putTimed('file.txt', 'content', {
      expiresAt,
      visibility: 'private',
    });

    expect(sendSpy.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
    expect(sendSpy.mock.calls[1][0]).toBeInstanceOf(PutObjectTaggingCommand);
    expect(sentCommand(1).input).toEqual({
      Bucket: 'test-bucket',
      Key: 'file.txt',
      Tagging: {
        TagSet: [{ Key: 'expiresAt', Value: String(expiresAt.getTime()) }],
      },
    });
  });

  it('lists files and returns public CDN URLs', async () => {
    sendSpy.mockResolvedValueOnce({
      Contents: [{ Key: 'a.txt' }, { Key: 'dir/b.txt' }],
    });

    await expect(driver.listFiles('dir/')).resolves.toEqual([
      'a.txt',
      'dir/b.txt',
    ]);
    await expect(driver.url('a.txt')).resolves.toBe(
      'https://cdn.example.com/a.txt',
    );
    expect(sendSpy).toHaveBeenCalledWith(expect.any(ListObjectsV2Command));
  });
});
