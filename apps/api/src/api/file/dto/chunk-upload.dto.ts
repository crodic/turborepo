import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsMimeType,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  FILE_UPLOAD_CHUNK_SIZE,
  FILE_UPLOAD_MAX_SIZE,
} from '../config/file.config';
import {
  FILE_FOLDER_NAME_MESSAGE,
  FILE_FOLDER_NAME_PATTERN,
} from '../utils/folder-name.util';

export class CreateChunkUploadSessionDto {
  @IsString()
  @MaxLength(255)
  originalName: string;

  @IsMimeType()
  mime: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(FILE_UPLOAD_MAX_SIZE)
  size: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  @Matches(FILE_FOLDER_NAME_PATTERN, { message: FILE_FOLDER_NAME_MESSAGE })
  folder?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalChunks: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(FILE_UPLOAD_CHUNK_SIZE)
  chunkSize: number;
}
