import { Expose } from 'class-transformer';

export class EmailRecipientOptionResDto {
  @Expose()
  id: string;

  @Expose()
  type: 'admin' | 'user';

  @Expose()
  name: string;

  @Expose()
  email: string;
}
