import {
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { IsIn } from 'class-validator';

export class ReviewRefundRequestReqDto {
  @StringField({
    description: 'Decision on the refund request',
    example: 'approve',
  })
  @IsIn(['approve', 'reject'])
  action!: 'approve' | 'reject';

  @StringFieldOptional({
    description: 'Admin response note or reason for rejection',
    example: 'Refund approved and initiated via payment gateway.',
  })
  adminNote?: string;

  @NumberFieldOptional({
    description:
      'Custom refund amount in cents / currency base unit (defaults to original request amount if not specified)',
    example: 1900,
    min: 1,
  })
  amount?: number;
}
