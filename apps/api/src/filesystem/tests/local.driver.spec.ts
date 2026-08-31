import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Readable } from 'node:stream';
import { LocalDriver } from '../drivers/local.driver';

describe('LocalDriver', () => {
  const testRoot = 'storage_test_local';
  let driver: LocalDriver;

  beforeEach(() => {
    driver = new LocalDriver(testRoot, 'local');
  });

  afterAll(async () => {
    const fullTestDir = path.resolve(process.cwd(), testRoot);
    await fs.rm(fullTestDir, { recursive: true, force: true });
  });

  it('should put and get file with Buffer', async () => {
    const content = Buffer.from('hello world');
    const filePath = 'test/hello.txt';

    const savedPath = await driver.put(filePath, content);
    expect(savedPath).toBe(filePath);

    const exists = await driver.exists(filePath);
    expect(exists).toBe(true);

    const retrieved = await driver.get(filePath);
    expect(retrieved.toString('utf-8')).toBe('hello world');
  });

  it('should put and get file with Stream', async () => {
    const stream = Readable.from(['streamed ', 'content']);
    const filePath = 'test/stream.txt';

    await driver.put(filePath, stream);

    const readStream = await driver.getStream(filePath);
    const chunks: Buffer[] = [];
    for await (const chunk of readStream) {
      chunks.push(Buffer.from(chunk as Uint8Array));
    }
    const result = Buffer.concat(chunks).toString('utf-8');
    expect(result).toBe('streamed content');
  });

  it('should return correct size and mimeType', async () => {
    const filePath = 'test/data.json';
    await driver.put(filePath, JSON.stringify({ key: 'value' }));

    const size = await driver.size(filePath);
    expect(size).toBeGreaterThan(0);

    const mime = await driver.mimeType(filePath);
    expect(mime).toBe('application/json');
  });

  it('should copy and move files', async () => {
    const original = 'test/orig.txt';
    const copied = 'test/copied.txt';
    const moved = 'test/moved.txt';

    await driver.put(original, 'content');
    const copyResult = await driver.copy(original, copied);
    expect(copyResult).toBe(true);
    expect(await driver.exists(copied)).toBe(true);

    const moveResult = await driver.move(copied, moved);
    expect(moveResult).toBe(true);
    expect(await driver.exists(copied)).toBe(false);
    expect(await driver.exists(moved)).toBe(true);
  });

  it('should delete file and delete directory', async () => {
    const file1 = 'test/dir/file1.txt';
    const file2 = 'test/dir/file2.txt';

    await driver.put(file1, '1');
    await driver.put(file2, '2');

    await driver.delete(file1);
    expect(await driver.exists(file1)).toBe(false);

    await driver.deleteDirectory('test/dir');
    expect(await driver.exists(file2)).toBe(false);
  });

  it('should throw error when requesting url or temporaryUrl on private local disk', async () => {
    expect(() => driver.url('test.txt')).toThrow();
    await expect(driver.temporaryUrl('test.txt', 3600)).rejects.toThrow();
  });
});
