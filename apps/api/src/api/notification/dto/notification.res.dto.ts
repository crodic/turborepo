import { AutoIncrementID } from '@/common/types/common.type';
import { ClassField, StringField } from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class NotificationResDto {
  @StringField()
  @Expose()
  id: AutoIncrementID;

  @StringField()
  @Expose()
  adminId: AutoIncrementID;

  @StringField()
  @Expose()
  type: string;

  @StringField()
  @Expose()
  title: string;

  @StringField()
  @Expose()
  message: string;

  @Expose()
  data?: Record<string, unknown> | null;

  @ClassField(() => Date, { nullable: true, required: false })
  @Expose()
  readAt?: Date | null;

  @ClassField(() => Date)
  @Expose()
  createdAt: Date;
}
