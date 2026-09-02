import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { UserSummaryDto } from './user-summary.dto';

@Exclude()
export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @Expose()
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @Expose()
  refreshToken!: string;

  @ApiProperty({ example: 'Bearer' })
  @Expose()
  tokenType!: string;

  @ApiProperty({ example: '15m' })
  @Expose()
  expiresIn!: string;

  @ApiProperty({ example: 'c1d2e3f4-5678-90ab-cdef-1234567890ab' })
  @Expose()
  sessionId!: string;

  @ApiProperty({ type: () => UserSummaryDto })
  @Expose()
  @Type(() => UserSummaryDto)
  user!: UserSummaryDto;
}
