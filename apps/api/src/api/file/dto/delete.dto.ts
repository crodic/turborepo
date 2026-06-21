import { IsString } from 'class-validator';

export class DeleteDto {
  @IsString()
  public_id: string;
}
