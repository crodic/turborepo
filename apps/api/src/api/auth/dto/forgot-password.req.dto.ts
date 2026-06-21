import { EmailField } from '@/decorators/field.decorators';

export class ForgotPasswordReqDto {
  @EmailField()
  email!: string;
}
