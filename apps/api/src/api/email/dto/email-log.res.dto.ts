import { AutoIncrementID } from '@/common/types/common.type';
import { EEmailLogSource, EEmailLogStatus } from '@/constants/entity.enum';
import {
  ArrayField,
  ClassField,
  EnumField,
  NumberField,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class EmailLogResDto {
  @StringField()
  @Expose()
  id: AutoIncrementID;

  @EnumField(() => EEmailLogSource)
  @Expose()
  source: EEmailLogSource;

  @EnumField(() => EEmailLogStatus)
  @Expose()
  status: EEmailLogStatus;

  @StringField()
  @Expose()
  subject: string;

  @StringField()
  @Expose()
  from: string;

  @ArrayField(String)
  @Expose()
  to: string[];

  @ArrayField(String, { required: false })
  @Expose()
  cc?: string[];

  @ArrayField(String, { required: false })
  @Expose()
  bcc?: string[];

  @StringFieldOptional()
  @Expose()
  body?: string;

  @StringFieldOptional()
  @Expose()
  renderedBody?: string;

  @StringFieldOptional()
  @Expose()
  templateName?: string;

  @Expose()
  attachments?: Record<string, any>[];

  @ClassField(() => Date, { required: false })
  @Expose()
  scheduledAt?: Date;

  @ClassField(() => Date, { required: false })
  @Expose()
  sentAt?: Date;

  @ClassField(() => Date, { required: false })
  @Expose()
  failedAt?: Date;

  @ClassField(() => Date, { required: false })
  @Expose()
  cancelledAt?: Date;

  @StringFieldOptional()
  @Expose()
  errorMessage?: string;

  @StringFieldOptional()
  @Expose()
  queueJobId?: string;

  @StringFieldOptional()
  @Expose()
  jobName?: string;

  @NumberField()
  @Expose()
  attempts: number;

  @StringFieldOptional()
  @Expose()
  createdByAdminId?: AutoIncrementID;

  @Expose()
  @Transform(
    ({ obj }) =>
      obj.createdByAdmin
        ? {
            id: obj.createdByAdmin.id,
            email: obj.createdByAdmin.email,
            fullName: obj.createdByAdmin.fullName,
          }
        : null,
    { toClassOnly: true },
  )
  createdByAdmin?: {
    id: AutoIncrementID;
    email: string;
    fullName: string;
  } | null;

  @ClassField(() => Date)
  @Expose()
  createdAt: Date;

  @ClassField(() => Date)
  @Expose()
  updatedAt: Date;
}
