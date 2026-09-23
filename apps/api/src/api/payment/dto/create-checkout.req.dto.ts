import {
  EmailFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsUrl } from 'class-validator';

export class CreateCheckoutReqDto {
  @StringField({
    description: 'Polar Product ID to purchase or subscribe to',
    example: '123e4567-e89b-12d3-a456-426614174000',
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

  @StringFieldOptional({
    description: 'Internal User ID if the user is authenticated in your system',
    example: 'usr_123',
  })
  userId?: string;

  @ApiPropertyOptional({
    description:
      'Custom key-value metadata to attach to the checkout and order',
    example: { plan: 'pro', source: 'pricing_page' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
