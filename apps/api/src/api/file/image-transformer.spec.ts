import { ImageTransformer } from '@/utils/transformers/image.transformer';
import sharp from 'sharp';
import { ImageTransformOptions } from './types/upload.types';

describe('ImageTransformer', () => {
  let transformer: ImageTransformer;
  let pngBuffer: Buffer;

  const transform = (params: Partial<ImageTransformOptions>) =>
    transformer.transform(
      {
        buffer: pngBuffer,
        mimetype: 'image/png',
        originalname: 'source.png',
        fieldname: 'file',
        size: pngBuffer.length,
      } as Express.Multer.File,
      params as ImageTransformOptions,
    );

  beforeAll(async () => {
    pngBuffer = await sharp({
      create: {
        width: 32,
        height: 24,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
  });

  beforeEach(() => {
    transformer = new ImageTransformer();
  });

  it('returns transformed metadata and preserves file identity fields', async () => {
    const result = await transform({ format: 'webp', quality: 75 });

    expect(result).toEqual(
      expect.objectContaining({
        format: 'webp',
        originalname: 'source.png',
        fieldname: 'file',
        width: 32,
        height: 24,
      }),
    );
    expect(result.buffer.length).toBeGreaterThan(0);
    await expect(sharp(result.buffer).metadata()).resolves.toEqual(
      expect.objectContaining({ format: 'webp', width: 32, height: 24 }),
    );
  });

  it('resizes and crops to the requested dimensions', async () => {
    const result = await transform({
      width: 16,
      height: 16,
      crop: 'fill',
      format: 'png',
    });

    expect(result.width).toBe(16);
    expect(result.height).toBe(16);
    await expect(sharp(result.buffer).metadata()).resolves.toEqual(
      expect.objectContaining({ format: 'png', width: 16, height: 16 }),
    );
  });

  it('clamps very large blur values instead of throwing sharp errors', async () => {
    await expect(
      transform({
        effect: { type: 'blur', value: '199912' },
        format: 'png',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        format: 'png',
        originalname: 'source.png',
      }),
    );
  });

  it('falls back to default effect values for non-numeric input', async () => {
    await expect(
      transform({
        effect: { type: 'gamma', value: 'bad-value' },
        format: 'png',
      }),
    ).resolves.toEqual(expect.objectContaining({ format: 'png' }));
  });

  it('ignores unsupported effects without changing the output contract', async () => {
    await expect(
      transform({
        effect: { type: 'not-supported', value: '100' },
        format: 'jpg',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        format: 'jpg',
        width: 32,
        height: 24,
      }),
    );
  });
});
