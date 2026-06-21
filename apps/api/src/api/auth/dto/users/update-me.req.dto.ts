import { StringField } from '@/decorators/field.decorators';
import { Trim } from '@/decorators/transform.decorators';

export class UpdateAuthUserMeReqDto {
  @StringField()
  @Trim()
  firstName: string;

  @StringField()
  @Trim()
  lastName: string;
}
