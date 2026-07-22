import { EnumFieldOptional } from '@/decorators/field.decorators';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { ECmsPageStatus } from '../entities/cms-page.entity';
import { CmsPageTranslationDto } from './cms-page-translation.dto';

export class CreateCmsPageReqDto {
  @EnumFieldOptional(() => ECmsPageStatus)
  status?: ECmsPageStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CmsPageTranslationDto)
  translations: CmsPageTranslationDto[];
}
