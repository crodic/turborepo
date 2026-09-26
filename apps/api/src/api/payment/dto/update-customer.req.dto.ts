import { StringFieldOptional } from '@/decorators/field.decorators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class UpdateCustomerReqDto {
  @StringFieldOptional({
    description: 'Full name or company name of the customer',
    example: 'Jane Doe Updated',
  })
  name?: string;

  @StringFieldOptional({
    description: 'URL of the customer avatar image',
    example: 'https://avatar.example.com/jane-new.png',
  })
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Structured billing address for tax and invoice generation',
    example: {
      line1: '456 Mission St',
      city: 'San Francisco',
      state: 'CA',
      postal_code: '94105',
      country: 'US',
    },
  })
  @IsOptional()
  @IsObject()
  billingAddress?: Record<string, any>;

  @StringFieldOptional({
    description: 'Customer tax identification number (VAT, GST, etc.)',
    example: 'US987654321',
  })
  taxId?: string;

  @ApiPropertyOptional({
    description: 'Optional metadata key-value pairs',
    example: { source: 'admin_portal_edit' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
