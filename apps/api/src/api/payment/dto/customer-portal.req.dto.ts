import {
  EmailFieldOptional,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class CustomerPortalReqDto {
  @EmailFieldOptional({
    description: 'Email of the customer to open the portal for',
    example: 'customer@example.com',
  })
  customerEmail?: string;

  @StringFieldOptional({
    description: 'Polar Customer ID if known',
    example: 'cus_123456789',
  })
  customerId?: string;

  @StringFieldOptional({
    description: 'Internal User ID if the user is authenticated in your system',
    example: 'usr_123',
  })
  userId?: string;
}
