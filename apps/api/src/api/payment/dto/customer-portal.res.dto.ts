import { ApiProperty } from '@nestjs/swagger';

export class CustomerPortalResDto {
  @ApiProperty({
    description: 'Polar Customer Portal authenticated URL',
    example: 'https://sandbox.polar.sh/portal/xxx',
  })
  portalUrl!: string;
}
