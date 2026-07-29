import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class SendNotificationReqDto {
  @ApiPropertyOptional({
    description:
      'Array of target admin IDs. If empty or not provided, sends to all admins.',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  targetAdminIds?: number[];

  @ApiProperty({ description: 'Title of the notification' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Message body of the notification' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
