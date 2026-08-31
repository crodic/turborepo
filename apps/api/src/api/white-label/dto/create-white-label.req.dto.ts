import { EWhiteLabelTarget } from '@/constants/entity.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { WhiteLabelStyles } from '../entities/white-label.entity';

export class CreateWhiteLabelReqDto {
  @ApiProperty({ example: 'Default Brand' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Main brand identity and styling' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: EWhiteLabelTarget,
    default: EWhiteLabelTarget.ADMIN,
  })
  @IsOptional()
  @IsEnum(EWhiteLabelTarget)
  target?: EWhiteLabelTarget;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Visel Art' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brandName?: string;

  @ApiPropertyOptional({ example: 'Visel Art Portal' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  siteTitle?: string;

  @ApiPropertyOptional({ example: 'Creative Art & Design' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  siteTagline?: string;

  @ApiPropertyOptional({ example: '© 2026 Visel Art. All rights reserved.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  copyrightText?: string;

  @ApiPropertyOptional({ example: 'Visel Art - Modern Admin' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @ApiProperty()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  styles: WhiteLabelStyles;
}
