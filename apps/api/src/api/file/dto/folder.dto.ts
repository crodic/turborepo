import { Expose, Transform } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  FILE_FOLDER_NAME_MESSAGE,
  FILE_FOLDER_NAME_PATTERN,
} from '../utils/folder-name.util';

export class FileFolderResDto {
  @Expose()
  @IsString()
  folder: string;

  @Expose()
  @IsNumber()
  count: number;

  @Expose()
  @IsNumber()
  size: number;
}

export class CreateFolderDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  @Matches(FILE_FOLDER_NAME_PATTERN, { message: FILE_FOLDER_NAME_MESSAGE })
  folder: string;
}

export class RenameFolderDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  @Matches(FILE_FOLDER_NAME_PATTERN, { message: FILE_FOLDER_NAME_MESSAGE })
  folder: string;
}

export class DeleteFolderDto {
  @IsOptional()
  @IsString()
  folder?: string;
}
