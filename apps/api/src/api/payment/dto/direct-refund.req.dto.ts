import {
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { IsIn } from 'class-validator';
import { RefundReason } from '../entities/polar-refund-request.entity';

export class DirectRefundReqDto {
  @StringField({
    description: 'Reason for the refund',
    example: RefundReason.CUSTOMER_REQUEST,
  })
  @IsIn(Object.values(RefundReason))
  reason!: string;

  @StringFieldOptional({
    description: 'Internal admin comment or note',
    example: 'Direct refund requested via support ticket.',
  })
  comment?: string;

  @NumberFieldOptional({
    description:
      'Amount to refund in cents / currency base unit (optional, defaults to full order amount)',
    example: 1900,
    min: 1,
  })
  amount?: number;
}
