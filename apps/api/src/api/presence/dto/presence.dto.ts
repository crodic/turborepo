import { AutoIncrementID } from '@/common/types/common.type';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OnlinePresenceDto {
  @ApiProperty({ description: 'Unique user identifier' })
  id: AutoIncrementID;

  @ApiProperty({ enum: ['admin', 'user'], description: 'Account type' })
  type: 'admin' | 'user';

  @ApiPropertyOptional({ description: 'Current session ID if available' })
  sessionId?: AutoIncrementID | string;

  @ApiProperty({ description: 'User email address' })
  email: string;

  @ApiPropertyOptional({ description: 'User full display name' })
  fullName?: string;

  @ApiPropertyOptional({ description: 'Avatar image URL or path' })
  avatar?: string;

  @ApiProperty({ description: 'ISO timestamp of the last received heartbeat' })
  lastSeenAt: string;
}

export class PresenceCountsDto {
  @ApiProperty({ description: 'Number of online administrators' })
  admins: number;

  @ApiProperty({ description: 'Number of online regular users' })
  users: number;

  @ApiProperty({ description: 'Total online accounts' })
  total: number;
}

export class PresenceSnapshotDto {
  @ApiProperty({
    type: [OnlinePresenceDto],
    description: 'List of online administrators',
  })
  admins: OnlinePresenceDto[];

  @ApiProperty({
    type: [OnlinePresenceDto],
    description: 'List of online users',
  })
  users: OnlinePresenceDto[];

  @ApiProperty({ type: PresenceCountsDto, description: 'Summary counts' })
  counts: PresenceCountsDto;
}
