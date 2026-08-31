import { S3Driver } from '../drivers/s3.driver';

// Mock AWS S3 SDK
const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest
    .fn()
    .mockResolvedValue('https://mocked-signed-url.com/file.jpg'),
}));

describe('S3Driver', () => {
  let driver: S3Driver;

  beforeEach(() => {
    jest.clearAllMocks();
    driver = new S3Driver({
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      region: 'us-east-1',
      bucket: 'test-bucket',
      endpoint: 'http://localhost:9000',
      forcePathStyle: true,
    });
  });

  it('should put an object and return key', async () => {
    mockSend.mockResolvedValueOnce({});

    const result = await driver.put('photos/avatar.jpg', Buffer.from('image'));
    expect(result).toBe('photos/avatar.jpg');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('should get an object as buffer', async () => {
    mockSend.mockResolvedValueOnce({
      Body: {
        transformToByteArray: jest
          .fn()
          .mockResolvedValue(new Uint8Array(Buffer.from('hello'))),
      },
    });

    const result = await driver.get('file.txt');
    expect(result.toString('utf-8')).toBe('hello');
  });

  it('should check if object exists', async () => {
    mockSend.mockResolvedValueOnce({});
    const exists = await driver.exists('file.txt');
    expect(exists).toBe(true);

    mockSend.mockRejectedValueOnce(new Error('NotFound'));
    const notExists = await driver.exists('not-found.txt');
    expect(notExists).toBe(false);
  });

  it('should delete an object', async () => {
    mockSend.mockResolvedValueOnce({});
    const deleted = await driver.delete('file.txt');
    expect(deleted).toBe(true);
  });

  it('should return correct public url with endpoint', () => {
    const url = driver.url('photos/avatar.jpg');
    expect(url).toBe('http://localhost:9000/test-bucket/photos/avatar.jpg');
  });

  it('should generate temporary signed url', async () => {
    const tempUrl = await driver.temporaryUrl('private/doc.pdf', 3600);
    expect(tempUrl).toBe('https://mocked-signed-url.com/file.jpg');
  });
});
