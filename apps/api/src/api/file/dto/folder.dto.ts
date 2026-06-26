import { Expose } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

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
  @IsString()
  @MaxLength(255)
  folder: string;
}

export class RenameFolderDto {
  @IsString()
  @MaxLength(255)
  folder: string;
}

export class DeleteFolderDto {
  @IsOptional()
  @IsString()
  folder?: string;
}
