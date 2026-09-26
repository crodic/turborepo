import {
  BooleanFieldOptional,
  StringField,
} from '@/decorators/field.decorators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsObject, IsOptional } from 'class-validator';

export class CreateCustomFieldReqDto {
  @StringField({
    description: 'Internal identifier used as key when storing value',
    example: 'vat-number',
  })
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string'
      ? value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
      : value,
  )
  slug!: string;

  @StringField({
    description: 'Human readable name of the custom field',
    example: 'VAT / Tax Number',
  })
  name!: string;

  @StringField({
    description: 'Field type: text, number, date, checkbox, or select',
    example: 'text',
  })
  @IsIn(['text', 'number', 'date', 'checkbox', 'select'])
  type!: 'text' | 'number' | 'date' | 'checkbox' | 'select';

  @BooleanFieldOptional({
    description: 'Whether field is marked required during checkout flow',
    example: false,
  })
  required?: boolean;

  @ApiPropertyOptional({
    description:
      'Type-specific field properties (form_label, form_placeholder, form_help_text, options, etc.)',
    example: {
      form_label: 'Tax Identification Number',
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
