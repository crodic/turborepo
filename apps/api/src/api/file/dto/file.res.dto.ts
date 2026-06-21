import { Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class FileResDto {
  @IsString()
  @Expose()
  id: string;

  @Expose()
  @IsString()
  public_id: string;

  @Expose()
  @IsString()
  folder?: string;

  @Expose()
  @IsString()
  original_name: string;

  @Expose()
  @IsString()
  path: string;

  @Expose()
  @IsString()
  hash: string;

  @Expose()
  @IsString()
  mime: string;

  @Expose()
  @IsNumber()
  size: number;

  @Expose()
  @IsNumber()
  width?: number;

  @Expose()
  @IsNumber()
  height?: number;

  @Expose()
  @IsNumber()
  duration?: number;

  @Expose()
  @IsString()
  resource_type: string;

  @Expose()
  @IsString()
  status: string;

  @Expose()
  @IsString()
  url: string;

  @Expose()
  @IsString()
  created_at: string;

  @Expose()
  @IsString()
  updated_at: string;
}
