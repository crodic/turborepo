import {
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { IsIn } from 'class-validator';
import { RefundReason } from '../entities/payment-refund-request.entity';

export class CreateRefundRequestReqDto {
  @StringField({
    description: 'Reason for requesting a refund',
    example: RefundReason.SATISFACTION_GUARANTEE,
  })
  @IsIn(Object.values(RefundReason))
  reason!: string;

  @StringFieldOptional({
    description: 'Detailed explanation or customer feedback',
    example:
      'The service was not as expected and I would like to request a refund.',
  })
  customerNote?: string;
}
