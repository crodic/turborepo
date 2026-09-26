import {
  EmailFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsUrl } from 'class-validator';

export class CreateCheckoutReqDto {
  @StringField({
    description: 'Polar Product ID to purchase',
    example: 'f6387289-7bfc-42cc-8e85-00d4a922dc9f',
  })
  productId!: string;

  @ApiProperty({
    description: 'URL to redirect the customer to after successful payment',
    example: 'https://example.com/checkout/success?session_id={CHECKOUT_ID}',
  })
  @IsUrl({ require_tld: false })
  successUrl!: string;

  @EmailFieldOptional({
    description: 'Customer email address (pre-filled on checkout)',
    example: 'customer@example.com',
  })
  customerEmail?: string;

  @StringFieldOptional({
    description: 'Customer display name',
    example: 'John Doe',
  })
  customerName?: string;

  @ApiPropertyOptional({
    description: 'Custom key-value metadata to attach to checkout and order',
    example: { plan: 'pro', source: 'pricing_page' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
