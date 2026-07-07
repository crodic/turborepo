import { AutoIncrementID } from '@/common/types/common.type';
import { ESessionUserType } from '@/constants/entity.enum';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sessions')
export class SessionEntity extends AbstractEntity {
  constructor(data?: Partial<SessionEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    type: 'bigint',
    primaryKeyConstraintName: 'PK_session_id',
  })
  id!: AutoIncrementID;

  @Column({
    name: 'hash',
    type: 'varchar',
    length: 255,
  })
  hash!: string;

  @Index('IDX_sessions_user_id')
  @Column({
    name: 'user_id',
    type: 'bigint',
  })
  userId: AutoIncrementID;

  @Column({
    type: 'enum',
    enum: ESessionUserType,
    enumName: 'sessions_user_enum',
    nullable: false,
    name: 'user_type',
  })
  userType: ESessionUserType;

  @Index('IDX_sessions_impersonated_by')
  @Column({
    name: 'impersonated_by',
    type: 'bigint',
    nullable: true,
  })
  impersonatedBy?: AutoIncrementID;

  @Column({
    name: 'ip_address',
    type: 'varchar',
    nullable: true,
  })
  ipAddress?: string;

  @Column({
    name: 'user_agent',
    type: 'varchar',
    nullable: true,
  })
  userAgent?: string;

  @Index('IDX_sessions_is_suspicious')
  @Column({
    name: 'is_suspicious',
    type: 'boolean',
    default: false,
  })
  isSuspicious!: boolean;

  @Column({
    name: 'suspicious_reasons',
    type: 'jsonb',
    nullable: true,
  })
  suspiciousReasons?: string[] | null;

  @Column({
    name: 'expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  expiresAt?: Date;

  @Index('IDX_sessions_revoked_at')
  @Column({
    name: 'revoked_at',
    type: 'timestamptz',
    nullable: true,
  })
  revokedAt?: Date;
}
