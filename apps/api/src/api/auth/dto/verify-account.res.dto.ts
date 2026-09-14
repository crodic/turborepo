import {
  BooleanField,
  StringField,
  UUIDField,
} from '@/decorators/field.decorators';

export class VerifyAccountResDto {
  @BooleanField()
  verified: boolean;

  @StringField()
  message: string;

  @UUIDField()
  userId: string;
}
