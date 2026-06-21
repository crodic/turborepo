import { EmailField } from '@/decorators/field.decorators';

export class ResendEmailVerifyReqDto {
  @EmailField()
  email!: string;
}
