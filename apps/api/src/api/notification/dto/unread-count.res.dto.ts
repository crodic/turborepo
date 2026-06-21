import { NumberField } from '@/decorators/field.decorators';
import { Expose } from 'class-transformer';

export class NotificationUnreadCountResDto {
  @NumberField({ int: true, min: 0 })
  @Expose()
  unreadCount: number;
}
