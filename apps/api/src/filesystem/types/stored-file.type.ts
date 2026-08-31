export interface StoredFile {
  fieldName: string;
  originalName: string;
  encoding: string;
  mimetype: string;
  size: number;
  disk: string;
  path: string;
  url: string;
  buffer?: Buffer;
}
