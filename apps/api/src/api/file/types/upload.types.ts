export type ImageFormat = 'jpeg' | 'png' | 'webp';

export interface ImageSizeOption extends Omit<ImageTransformOptions, 'width'> {
  name: string;
  width: number;
  height?: number;
}

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  rotate?: number;
  crop?:
    | 'fill'
    | 'cover'
    | 'fit'
    | 'crop'
    | 'limit'
    | 'pad'
    | 'lfill'
    | 'thumb'
    | { x: number; y: number; width: number; height: number };
  gravity?: string;
  format?: string;
  quality?: number;
  aspectRatio?: string;
  effect?: { type: string; value: string | number | null };
  flip?: 'horizontal' | 'vertical';
  autoOrient?: boolean;
  background?: string;
  overlay?: string;
}

export interface UploadImageOptions {
  folder?: string;
  format?: ImageFormat;
  quality?: number;
  compress?: boolean;
  sizes?: ImageSizeOption[];
  generateThumbnail?: boolean;
  thumbnailWidth?: number;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  transform?: ImageTransformOptions;
}

export interface ImageTransformData {
  fieldname: string;
  originalname: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;

  width?: number;
  height?: number;
  format?: string;
}

export interface UploadFileOptions {
  folder?: string;
  rename?: boolean;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
}

export interface UploadVideoOptions {
  folder?: string;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  transform?: VideoTransformOptions;
}

export interface VideoTransformOptions {
  width?: number;
  height?: number;
  start?: number;
  duration?: number;
  fps?: number;
  bitrate?: number;
  format?: string;
  flip?: 'horizontal' | 'vertical';
  rotate?: number;
}
