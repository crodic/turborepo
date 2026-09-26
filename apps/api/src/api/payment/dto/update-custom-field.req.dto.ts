import { StringFieldOptional } from '@/decorators/field.decorators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class UpdateCustomFieldReqDto {
  @StringFieldOptional({
    description: 'Internal identifier used as key when storing value',
    example: 'vat_number',
  })
  slug?: string;

  @StringFieldOptional({
    description: 'Human readable name of the custom field',
    example: 'VAT / Tax Number Updated',
  })
  name?: string;

  @ApiPropertyOptional({
    description:
      'Type-specific field properties (form_label, form_placeholder, form_help_text, options, etc.)',
    example: {
      form_label: 'Updated Tax Identification Number',
      form_placeholder: 'e.g. EU123456789',
      form_help_text: 'Required for tax exemption',
    },
  })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Optional metadata key-value pairs',
    example: { section: 'billing' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
