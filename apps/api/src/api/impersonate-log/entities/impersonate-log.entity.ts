import { SessionEntity } from '@/api/auth/entities/session.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { EImpersonateLogStatus } from '@/constants/entity.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { ImpersonateLogHistoryEntity } from './impersonate-log-history.entity';

@Entity('impersonate_logs')
export class ImpersonateLogEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_impersonate_log_id',
    type: 'bigint',
  })
  id: AutoIncrementID;

  @Index('IDX_impersonate_logs_history_id')
  @Column({ name: 'history_id', type: 'bigint', nullable: true })
  historyId?: AutoIncrementID;

  @ManyToOne(() => ImpersonateLogHistoryEntity, (history) => history.items, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'history_id',
    foreignKeyConstraintName: 'FK_impersonate_logs_history',
  })
  history?: Relation<ImpersonateLogHistoryEntity>;

  @Index('IDX_impersonate_logs_session_id')
  @Column({ name: 'session_id', type: 'bigint' })
  sessionId: AutoIncrementID;

  @ManyToOne(() => SessionEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'session_id',
    foreignKeyConstraintName: 'FK_impersonate_logs_session',
  })
  session?: Relation<SessionEntity>;

  @Index('IDX_impersonate_logs_admin_id')
  @Column({ name: 'admin_id', type: 'bigint' })
  adminId: AutoIncrementID;

  @Index('IDX_impersonate_logs_target_user_id')
  @Column({ name: 'target_user_id', type: 'bigint' })
  targetUserId: AutoIncrementID;

  @Index('IDX_impersonate_logs_action')
  @Column()
  action: string;

  @Index('IDX_impersonate_logs_method')
  @Column()
  method: string;

  @Column()
  endpoint: string;

  @Index('IDX_impersonate_logs_entity_type')
  @Column({ name: 'entity_type', nullable: true })
  entityType?: string;

  @Index('IDX_impersonate_logs_entity_id')
  @Column({ name: 'entity_id', type: 'varchar', nullable: true })
  entityId?: string;

  @Column({ type: 'jsonb', nullable: true })
  input?: any;

  @Column({ type: 'jsonb', nullable: true })
  output?: any;

  @Column({ type: 'jsonb', nullable: true })
  before?: any;

  @Column({ type: 'jsonb', nullable: true })
  after?: any;

  @Column({ name: 'changed_fields', type: 'jsonb', nullable: true })
  changedFields?: any;

  @Index('IDX_impersonate_logs_status')
  @Column({
    type: 'enum',
    enum: EImpersonateLogStatus,
    enumName: 'impersonate_log_status_enum',
  })
  status: EImpersonateLogStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  @Index('IDX_impersonate_logs_created_at')
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  createdAt: Date;
}
