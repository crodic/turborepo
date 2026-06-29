import {
  BooleanFieldOptional,
  JsonFieldOptional,
} from '@/decorators/field.decorators';
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAdminUserReqDto } from './create-admin-user.req.dto';

export class UpdateMeReqDto extends PartialType(
  OmitType(CreateAdminUserReqDto, ['password', 'roleIds', 'email'] as const),
) {
  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Avatar image file (JPEG only, max size 5MB)',
  })
  avatar?: string;

  @BooleanFieldOptional()
  removeAvatar?: boolean;

  @JsonFieldOptional()
  notifications?: Record<string, boolean>;
}
