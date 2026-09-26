import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCheckoutResDto {
  @ApiProperty({
    description: 'Polar hosted checkout URL to redirect customer to',
    example: 'https://sandbox.polar.sh/checkout/xxx',
  })
  checkoutUrl!: string;

  @ApiProperty({
    description: 'Polar checkout session ID',
    example: 'checkout_123',
  })
  checkoutId!: string;

  @ApiProperty({
    description: 'Internal order reference number',
    example: 'ORD-LXYZ-ABC123',
  })
  orderNumber!: string;

  @ApiPropertyOptional({
    description: 'Total order amount in cents',
    example: 2900,
  })
  amount?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'usd',
  })
  currency?: string;
}
