declare global {
  // Express exposes request augmentation through this namespace.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      uploadedFiles?: StoredFile[];
      uploadedFile?: StoredFile;
    }
  }
}

/**
 * Represents a file stored via the file storage system.
 * Extends Express.Multer.File, omitting destination and path.
 */
export interface StoredFile extends Omit<
  Express.Multer.File,
  'destination' | 'path'
> {
  storagePath: string;
  disk: string;
}
