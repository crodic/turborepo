import { EmailField, StringFieldOptional } from '@/decorators/field.decorators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class CreateCustomerReqDto {
  @EmailField({
    description: 'Email address of the customer',
    example: 'customer@example.com',
  })
  email!: string;

  @StringFieldOptional({
    description: 'Full name or company name of the customer',
    example: 'Jane Doe',
  })
  name?: string;

  @StringFieldOptional({
    description: 'URL of the customer avatar image',
    example: 'https://avatar.example.com/jane.png',
  })
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Structured billing address for tax and invoice generation',
    example: {
      line1: '123 Market St',
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
    example: 'US123456789',
  })
  taxId?: string;

  @ApiPropertyOptional({
    description: 'Optional metadata key-value pairs',
    example: { source: 'admin_portal' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
