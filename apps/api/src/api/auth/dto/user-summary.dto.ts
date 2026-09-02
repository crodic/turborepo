import { DomainType } from '@/constants/entity.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserSummaryDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  @Expose()
  email!: string;

  @ApiPropertyOptional({ example: 'John' })
  @Expose()
  firstName?: string | null;

  @ApiPropertyOptional({ example: 'Doe' })
  @Expose()
  lastName?: string | null;

  @ApiPropertyOptional({ example: 'John Doe' })
  @Expose()
  fullName?: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @Expose()
  avatarUrl?: string | null;

  @ApiProperty({ enum: DomainType, example: DomainType.CLIENT })
  @Expose()
  domain!: DomainType;

  @ApiProperty({ example: ['SUPER ADMIN'] })
  @Expose()
  roles!: string[];
}
