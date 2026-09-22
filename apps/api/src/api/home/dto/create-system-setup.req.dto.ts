import { WhiteLabelStyles } from '@/api/white-label/entities/white-label.entity';
import {
  EmailField,
  PasswordField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class CreateSystemSetupReqDto {
  @EmailField()
  email: string;

  @PasswordField()
  password: string;

  @StringFieldOptional()
  systemRoleName?: string;

  @StringFieldOptional()
  firstName?: string;

  @StringFieldOptional()
  lastName?: string;

  @StringFieldOptional()
  site_brand?: string;

  @StringFieldOptional()
  theme_key?: string;

  @ApiPropertyOptional({
    description: 'Custom theme style tokens for light and dark modes',
  })
  @IsOptional()
  custom_styles?: WhiteLabelStyles;
}
