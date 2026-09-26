import { StringFieldOptional } from '@/decorators/field.decorators';

export class CustomerPortalReqDto {
  @StringFieldOptional({
    description: 'Polar customer ID (if known)',
    example: 'cus_123',
  })
  customerId?: string;
}
