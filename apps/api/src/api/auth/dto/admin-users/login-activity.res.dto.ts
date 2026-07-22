import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class ActivityDataDto {
  @ApiProperty({ description: 'Date in YYYY-MM-DD format' })
  @Expose()
  date: string;

  @ApiProperty({ description: 'Number of login sessions on this date' })
  @Expose()
  count: number;

  @ApiProperty({ description: 'Activity level (0-4) based on count' })
  @Expose()
  level: number;
}

export class LoginActivityResDto {
  @ApiProperty({ description: 'Total sessions in the given period' })
  @Expose()
  totalSessions: number;

  @ApiProperty({ description: 'Total active days in the given period' })
  @Expose()
  activeDays: number;

  @ApiProperty({ type: [ActivityDataDto], description: 'Activity data points' })
  @Expose()
  @Type(() => ActivityDataDto)
  data: ActivityDataDto[];
}
