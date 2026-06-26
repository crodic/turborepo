import { Type } from 'class-transformer';
import {
  IsInt,
  IsMimeType,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  FILE_UPLOAD_CHUNK_SIZE,
  FILE_UPLOAD_MAX_SIZE,
} from '../config/file.config';

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
  @IsString()
  @MaxLength(255)
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
