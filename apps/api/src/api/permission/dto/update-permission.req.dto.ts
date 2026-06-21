import {
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class UpdatePermissionReqDto {
  @StringField()
  group: string;

  @StringFieldOptional({ minLength: 0 })
  description?: string;
}
