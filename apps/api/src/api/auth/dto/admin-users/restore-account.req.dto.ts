import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RestoreAccountReqDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;
}
