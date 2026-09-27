import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateBenefitReqDto {
  @ApiProperty({
    description:
      'Type of benefit: custom, license_keys, downloadables, discord, github_repository, meter_credit, feature_flag',
    example: 'custom',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description:
      'Description/name of the benefit displayed to customers (max 42 chars)',
    example: '500 Free Credits',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(42)
  description: string;

  @ApiPropertyOptional({
    description: 'Additional properties depending on benefit type',
  })
  @IsObject()
  @IsOptional()
  properties?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Key-value metadata object',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
