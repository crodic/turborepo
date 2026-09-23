import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutResDto {
  @ApiProperty({
    description: 'URL to redirect the customer to complete payment on Polar',
    example: 'https://sandbox.polar.sh/checkout/chk_123456789',
  })
  checkoutUrl!: string;

  @ApiProperty({
    description: 'Polar Checkout Session ID',
    example: 'chk_123456789',
  })
  checkoutId!: string;

  @ApiProperty({
    description: 'Internal unique order number created in your system',
    example: 'ORD-20260923-A1B2C3D4',
  })
  orderNumber!: string;
}
