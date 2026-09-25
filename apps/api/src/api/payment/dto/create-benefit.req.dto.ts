import { StringField } from '@/decorators/field.decorators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional } from 'class-validator';

export class CreateBenefitReqDto {
  @StringField({
    description: 'Type of benefit (custom, license_keys)',
    example: 'custom',
    default: 'custom',
  })
  @IsIn(['custom', 'license_keys'])
  type!: string;

  @StringField({
    description: 'The title/description of the benefit shown to customers',
    example: 'Contact 24/7 Priority Support',
  })
  description!: string;

  @ApiPropertyOptional({
    description:
      'Benefit properties. For custom: { note?: string } (Markdown note shown after purchase)',
    example: { note: 'Join our private Discord: https://discord.gg/example' },
  })
  @IsObject()
  @IsOptional()
  properties?: {
    note?: string;
  };
}
