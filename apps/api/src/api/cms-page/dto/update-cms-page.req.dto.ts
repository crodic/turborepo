import { EnumFieldOptional } from '@/decorators/field.decorators';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { ECmsPageStatus } from '../entities/cms-page.entity';
import { CmsPageTranslationDto } from './cms-page-translation.dto';

export class UpdateCmsPageReqDto {
  @EnumFieldOptional(() => ECmsPageStatus)
  status?: ECmsPageStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CmsPageTranslationDto)
  translations?: CmsPageTranslationDto[];
}
