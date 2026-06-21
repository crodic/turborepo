import { Injectable } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { ImageTransformOptions } from '../../api/file/types/upload.types';

@Injectable()
export class ImageTransformer {
  /**
   * Transforms an image using the provided options.
   * @param file The file to transform.
   * @param params The transformation options.
   * @returns A promise that resolves to an object containing the transformed image as a Buffer, the format of the image, the size of the image in bytes, the width and height of the image, and the sharp metadata.
   */
  async transform(
    file: Express.Multer.File,
    params: ImageTransformOptions,
  ): Promise<{
    buffer: Buffer;
    format: string;
    size: number;
    width?: number;
    height?: number;
    metadata: sharp.Metadata;
    originalname: string;
    fieldname: string;
  }> {
    const buffer = file.buffer;

    let img = sharp(buffer, { failOnError: false });

    // Auto-orient
    if (params.autoOrient) img = img.rotate();

    // Resize
    if (params.width || params.height) {
      img = this.applyResize(img, params);
    }

    // Crop
    if (params.crop) {
      img = await this.applyCrop(img, params);
    }

    // Aspect Ratio
    if (params.aspectRatio) {
      img = await this.applyAspectRatio(img, params);
    }

    // Overlay / Watermark
    if (params.overlay) {
      img = await this.applyOverlay(img, params);
    }

    // Effect
    if (params.effect) {
      img = this.applyEffect(img, params);
    }

    // Flip
    if (params.flip) {
      img = this.applyFlip(img, params.flip);
    }

    // Rotation
    if (params.rotate) {
      img = img.rotate(params.rotate);
    }

    // Background padding
    if (params.background) {
      img = await this.applyBackground(img, params);
    }

    // Format
    const format = params.format || 'jpg';
    const quality = params.quality || 90;
    img = this.applyFormat(img, format, quality);

    // Export → BUFFER
    const outBuffer = await img.toBuffer();
    const metadata = await sharp(outBuffer).metadata();

    return {
      buffer: outBuffer,
      format,
      size: outBuffer.length,

      width: metadata.width,
      height: metadata.height,
      metadata,

      fieldname: file.fieldname,
      originalname: file.originalname,
    };
  }

  /**
   * Applies the given format to the image and sets the quality.
   * Supported formats are 'png', 'webp', 'jpg', and 'jpeg'.
   * If the format is not supported, the image will be saved as a JPEG with the given quality.
   * @param img The image to be formatted.
   * @param format The format to be applied.
   * @param quality The quality of the image (1-100).
   * @returns The formatted image.
   */
  private applyFormat(img: sharp.Sharp, format: string, quality: number) {
    switch (format) {
      case 'png':
        return img.png();
      case 'webp':
        return img.webp({ quality });
      case 'jpg':
      case 'jpeg':
      default:
        return img.jpeg({ quality });
    }
  }

  /**
   * Resizes the image while maintaining the aspect ratio.
   * If either width or height is not provided, the image will not be resized in that dimension.
   * @param img The image to apply the resize transformation to.
   * @param params The transformation options. Must contain either width or height or both.
   * @returns The resized image.
   */
  private applyResize(img: sharp.Sharp, params: any) {
    const w = params.width || null;
    const h = params.height || null;

    return img.resize({
      width: w,
      height: h,
      fit: sharp.fit.contain,
      withoutEnlargement: false,
    });
  }

  /**
   * Apply crop transformation to the image.
   * Supported crop variants are:
   * - `fill`: Resize the image to fill the dimensions while maintaining the aspect ratio.
   * - `cover`: Resize the image to cover the dimensions and crop the overflowing parts.
   * - `fit`: Resize the image to fit within the dimensions while maintaining the aspect ratio.
   * - `crop`: Crop the image to the specified dimensions.
   * - `limit`: Resize the image to fit within the dimensions while maintaining the aspect ratio, without enlarging the image if it is smaller than the specified dimensions.
   * - `pad`: Resize the image to fit within the dimensions while maintaining the aspect ratio, and pad the non-overlapping parts with a background color.
   * - `lfill`: Resize the image to fill the dimensions while maintaining the aspect ratio, and fill the non-overlapping parts with a color.
   * - `thumb`: Resize the image to cover the dimensions and crop the overflowing parts, and position the image according to the specified gravity.
   * @param img The image to apply the crop transformation to.
   * @param params The transformation options.
   * @returns The transformed image.
   */
  private async applyCrop(img: sharp.Sharp, params: ImageTransformOptions) {
    const crop = params.crop;

    // Object crop e.g. { x, y, width, height }
    if (crop && typeof crop === 'object') {
      const { x, y, width, height } = crop;
      return img.extract({ left: x, top: y, width, height });
    }

    // For string crop variants, width & height are required
    const w = params.width;
    const h = params.height;

    if (!w || !h) return img;

    const metadata = await img.metadata();
    const srcW = metadata.width!;
    const srcH = metadata.height!;

    const gravityMap = {
      north: sharp.gravity.north,
      south: sharp.gravity.south,
      east: sharp.gravity.east,
      west: sharp.gravity.west,
      center: sharp.gravity.center,
      face: sharp.gravity.center,
      auto: sharp.gravity.center,
    };

    switch (crop) {
      case 'fill':
      case 'cover':
        return img.resize({
          width: w,
          height: h,
          fit: sharp.fit.cover,
        });

      case 'fit':
        return img.resize({
          width: w,
          height: h,
          fit: sharp.fit.inside,
        });

      case 'crop':
        return img.extract({
          left: 0,
          top: 0,
          width: Math.min(w, srcW),
          height: Math.min(h, srcH),
        });

      case 'limit':
        return img.resize({
          width: w,
          height: h,
          fit: sharp.fit.inside,
          withoutEnlargement: true,
        });

      case 'pad': {
        const bg = params.background || '#000';
        return img.resize({
          width: w,
          height: h,
          fit: sharp.fit.contain,
          background: bg,
        });
      }

      case 'lfill':
        return img.resize({
          width: w,
          height: h,
          fit: sharp.fit.cover,
        });

      case 'thumb': {
        const gravity = gravityMap[params.gravity] || sharp.gravity.center;
        return img.resize({
          width: w,
          height: h,
          fit: sharp.fit.cover,
          position: gravity,
        });
      }

      default:
        return img;
    }
  }

  /**
   * Apply aspect ratio transformation to the image.
   *
   * If the aspect ratio contains a colon (:) it will be split into
   * width and height and the image will be resized based on the ratio.
   *
   * For example, '1:1' will resize the image to a square.
   *
   * If the aspect ratio does not contain a colon, it will be ignored.
   *
   * @param img The image to apply the aspect ratio transformation to.
   * @param params The transformation options.
   * @returns The transformed image.
   */
  private async applyAspectRatio(
    img: sharp.Sharp,
    params: ImageTransformOptions,
  ) {
    const ar = params.aspectRatio;

    if (!ar) return img;

    const metadata = await img.metadata();
    const srcW = metadata.width!;

    if (ar.includes(':')) {
      const [w, h] = ar.split(':').map(Number);
      const ratio = w / h;
      const newH = Math.round(srcW / ratio);
      return img.resize({ width: srcW, height: newH });
    }

    return img;
  }

  /**
   * Applies an overlay to the image.
   *
   * Supports three types of overlays:
   *   1. Logo: `l_<name>`, where `<name>` is the name of the logo.
   *   2. URL: `fetch:<url>`, where `<url>` is the URL of the overlay image.
   *   3. Text: `text:<text>`, where `<text>` is the text to be overlay.
   *
   * @param img The image to apply the overlay to.
   * @param params The transformation options.
   * @returns The transformed image.
   */
  private async applyOverlay(img: sharp.Sharp, params: ImageTransformOptions) {
    const overlay = params.overlay;

    // l_logo
    if (/^[\w-]+$/.test(overlay)) {
      const p = path.join('public/overlays', `${overlay}.png`);
      if (fs.existsSync(p)) {
        const ov = await sharp(p).toBuffer();
        return img.composite([{ input: ov, gravity: 'southeast' }]);
      }
    }

    // fetch:https://...
    if (overlay.startsWith('fetch:')) {
      const url = overlay.substring(6);
      const res = await fetch(url);
      const buf = Buffer.from(await res.arrayBuffer());

      return img.composite([{ input: buf, gravity: 'southeast' }]);
    }

    // text:...
    if (overlay.startsWith('text:')) {
      const text = overlay.replace(/^text:/, '');

      const svg = `
        <svg width="500" height="200">
          <text x="20" y="40" font-size="40" fill="white">${text}</text>
        </svg>`;

      return img.composite([{ input: Buffer.from(svg), gravity: 'northwest' }]);
    }

    return img;
  }

  /**
   * Applies an effect to the image.
   *
   * The supported effects are:
   * - blur: blurs the image with the given radius (default: 10)
   * - pixelate: resizes the image to 100x100 and then back to its original size
   * - sharpen: sharpens the image with the given amount (default: 10)
   * - grayscale: converts the image to grayscale
   * - brightness: adjusts the brightness of the image with the given value (default: 1)
   * - contrast: adjusts the contrast of the image with the given value (default: 1)
   * - gamma: adjusts the gamma of the image with the given value (default: 1)
   * - colorize: converts the image to grayscale and then applies a tint with the given color (default: #ffffff)
   *
   * @param img The image to apply the effect to.
   * @param params The transformation options.
   * @returns The transformed image.
   */
  private applyEffect(img: sharp.Sharp, params: ImageTransformOptions) {
    const { type, value } = params.effect;
    const v = value ? Number(value) : null;

    switch (type) {
      case 'blur':
        return img.blur(v || 10);
      case 'pixelate':
        return img.resize({ width: 100 }).resize({
          width: null,
          height: null,
        });
      case 'sharpen':
        return img.sharpen({ sigma: v || 10 });
      case 'grayscale':
        return img.grayscale();
      case 'brightness':
        return img.modulate({ brightness: v || 1 });
      case 'contrast':
        return img.linear(v || 1);
      case 'gamma':
        return img.gamma(v || 1);
      case 'colorize':
        return img.tint('#ffffff');
      default:
        return img;
    }
  }

  /**
   * Applies a flip transformation to the image.
   * Supported flip variants are:
   *   - 'horizontal': Flips the image horizontally.
   *   - 'vertical': Flips the image vertically.
   * @param img The image to apply the flip transformation to.
   * @param flip The flip transformation to apply.
   * @returns The flipped image.
   */
  private applyFlip(img: sharp.Sharp, flip: ImageTransformOptions['flip']) {
    if (flip === 'horizontal') return img.flop();
    if (flip === 'vertical') return img.flip();
    return img;
  }

  /**
   * Applies a background color to the image.
   * The background color can be specified manually using the `background` option, or it can be set to `auto` to automatically detect the dominant color of the image.
   * @param img The image to apply the background color to.
   * @param params The transformation options.
   * @returns The image with the applied background color.
   */
  private async applyBackground(img: sharp.Sharp, params: any) {
    // const metadata = await img.metadata();

    // const bgColorDefault = metadata.background || 'transparent';

    const bg =
      params.background === 'auto' ? this.getAutoColor(img) : params.background;

    return img.flatten({ background: bg });
  }

  /**
   * Returns the dominant color of the image in the RGB format.
   *
   * It works by reading the raw pixel data of the image and extracting the first pixel's color.
   * This is a very basic implementation and may not work well for all images.
   *
   * @param img The image to get the dominant color from.
   * @returns A string representing the dominant color of the image in the RGB format.
   */
  protected async getAutoColor(img: sharp.Sharp) {
    const { data } = await img.raw().toBuffer({ resolveWithObject: true });
    const r = data[0];
    const g = data[1];
    const b = data[2];
    return `rgb(${r},${g},${b})`;
  }
}
