import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import {
  FILE_FOLDER_NAME_MESSAGE,
  FILE_FOLDER_NAME_PATTERN,
} from '../utils/folder-name.util';

export class UploadDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(FILE_FOLDER_NAME_PATTERN, { message: FILE_FOLDER_NAME_MESSAGE })
  folder?: string;
}
