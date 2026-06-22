import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { SessionEntity } from '@/api/auth/entities/session.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { EImpersonateHistoryStatus } from '@/constants/entity.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { ImpersonateLogEntity } from './impersonate-log.entity';

@Entity('impersonate_log_histories')
export class ImpersonateLogHistoryEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_impersonate_log_history_id',
    type: 'bigint',
  })
  id: AutoIncrementID;

  @Index('IDX_impersonate_log_histories_session_id', { unique: true })
  @Column({ name: 'session_id', type: 'bigint' })
  sessionId: AutoIncrementID;

  @ManyToOne(() => SessionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session?: Relation<SessionEntity>;

  @Index('IDX_impersonate_log_histories_admin_id')
  @Column({ name: 'admin_id', type: 'bigint' })
  adminId: AutoIncrementID;

  @ManyToOne(() => AdminUserEntity)
  @JoinColumn({ name: 'admin_id' })
  admin?: Relation<AdminUserEntity>;

  @Index('IDX_impersonate_log_histories_target_user_id')
  @Column({ name: 'target_user_id', type: 'bigint' })
  targetUserId: AutoIncrementID;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'target_user_id' })
  targetUser?: Relation<UserEntity>;

  @Column({ type: 'text' })
  reason: string;

  @Index('IDX_impersonate_log_histories_status')
  @Column({
    type: 'enum',
    enum: EImpersonateHistoryStatus,
    enumName: 'impersonate_history_status_enum',
  })
  status: EImpersonateHistoryStatus;

  @Index('IDX_impersonate_log_histories_started_at')
  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Index('IDX_impersonate_log_histories_stopped_at')
  @Column({ name: 'stopped_at', type: 'timestamptz', nullable: true })
  stoppedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  @OneToMany(() => ImpersonateLogEntity, (log) => log.history)
  items?: Relation<ImpersonateLogEntity[]>;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  createdAt: Date;
}
