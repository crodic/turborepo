import { AutoIncrementID } from '@/common/types/common.type';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class PolarCustomFieldResDto {
  @ApiProperty({ example: 1 })
  @Transform(({ value }: { value: any }) =>
    value != null ? Number(value) : value,
  )
  id!: AutoIncrementID;

  @ApiProperty({ example: 'cf_123456789' })
  polarCustomFieldId!: string;

  @ApiProperty({
    example: 'text',
    enum: ['text', 'number', 'date', 'checkbox', 'select'],
  })
  type!: string;

  @ApiProperty({ example: 'vat_number' })
  slug!: string;

  @ApiProperty({ example: 'VAT / Tax Number' })
  name!: string;

  @ApiProperty({
    example: {
      form_label: 'Tax Identification Number',
      form_placeholder: 'e.g. EU123456789',
    },
  })
  properties!: Record<string, any>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, any> | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}
