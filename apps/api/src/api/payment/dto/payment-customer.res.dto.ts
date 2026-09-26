import { AutoIncrementID } from '@/common/types/common.type';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentCustomerResDto {
  @ApiProperty({ example: 1 })
  id!: AutoIncrementID;

  @ApiPropertyOptional({ example: 1 })
  userId?: AutoIncrementID | null;

  @ApiProperty({ example: 'cus_123456789' })
  polarCustomerId!: string;

  @ApiProperty({ example: 'customer@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  name?: string | null;

  @ApiPropertyOptional({ example: 'https://avatar.example.com/jane.png' })
  avatarUrl?: string | null;

  @ApiPropertyOptional({
    example: {
      line1: '123 Market St',
      city: 'San Francisco',
      country: 'US',
    },
  })
  billingAddress?: Record<string, any> | null;

  @ApiPropertyOptional({ example: 'US123456789' })
  taxId?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, any> | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}
