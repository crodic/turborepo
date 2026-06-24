import { EThemeTarget } from '@/constants/entity.enum';
import { IsEnum } from 'class-validator';

export class PublishThemeReqDto {
  @IsEnum(EThemeTarget)
  target: EThemeTarget;
}
