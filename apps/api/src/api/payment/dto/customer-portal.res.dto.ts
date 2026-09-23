import { ApiProperty } from '@nestjs/swagger';

export class CustomerPortalResDto {
  @ApiProperty({
    description: 'Pre-authenticated direct URL to the Polar Customer Portal',
    example:
      'https://sandbox.polar.sh/your-org/portal?customer_session_token=token_123',
  })
  portalUrl!: string;

  @ApiProperty({
    description: 'Alias of portalUrl for client convenience',
    example:
      'https://sandbox.polar.sh/your-org/portal?customer_session_token=token_123',
  })
  url?: string;
}
