import {
  EmailFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsUrl } from 'class-validator';

export class CreateCheckoutReqDto {
  @StringField({
    description: 'Plan slug identifier (e.g. pro, enterprise)',
    example: 'pro',
  })
  planSlug!: string;

  @StringField({
    description: 'Billing interval: monthly, yearly, or one_time',
    example: 'monthly',
  })
  @IsIn(['monthly', 'yearly', 'one_time'])
  interval!: string;

  @StringFieldOptional({
    description: 'Optional Polar Product ID fallback',
    example: 'f6387289-7bfc-42cc-8e85-00d4a922dc9f',
  })
  productId?: string;

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

  @StringFieldOptional({
    description: 'Payment gateway provider (default: polar)',
    example: 'polar',
  })
  gateway?: string;
}
