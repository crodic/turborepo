import { PartialType } from '@nestjs/mapped-types';
import { CreateThemeReqDto } from './create-theme.req.dto';

export class UpdateThemeReqDto extends PartialType(CreateThemeReqDto) {}
