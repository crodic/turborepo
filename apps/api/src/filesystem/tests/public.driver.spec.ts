import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { PublicDriver } from '../drivers/public.driver';

describe('PublicDriver', () => {
  const testRoot = 'storage_test_public';
  let driver: PublicDriver;

  beforeEach(() => {
    driver = new PublicDriver(testRoot, 'http://localhost:3000');
  });

  afterAll(async () => {
    const fullTestDir = path.resolve(process.cwd(), testRoot);
    await fs.rm(fullTestDir, { recursive: true, force: true });
  });

  it('should generate correct public URL', () => {
    const url = driver.url('avatars/user1.png');
    expect(url).toBe(`http://localhost:3000/${testRoot}/avatars/user1.png`);
  });

  it('should generate temporaryUrl identical to public url', async () => {
    const tempUrl = await driver.temporaryUrl('images/banner.jpg', 3600);
    expect(tempUrl).toBe(`http://localhost:3000/${testRoot}/images/banner.jpg`);
  });

  it('should put and retrieve public files', async () => {
    const filePath = 'uploads/doc.txt';
    await driver.put(filePath, 'public content');

    expect(await driver.exists(filePath)).toBe(true);
    const content = await driver.get(filePath);
    expect(content.toString('utf-8')).toBe('public content');
  });
});
