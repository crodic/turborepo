import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { EEmailLogSource, EEmailLogStatus } from '@/constants/entity.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';

@Entity('email_logs')
export class EmailLogEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_email_log_id',
    type: 'bigint',
  })
  id: AutoIncrementID;

  @Index('IDX_email_logs_source')
  @Column({
    type: 'enum',
    enum: EEmailLogSource,
    enumName: 'email_log_source_enum',
  })
  source: EEmailLogSource;

  @Index('IDX_email_logs_status')
  @Column({
    type: 'enum',
    enum: EEmailLogStatus,
    enumName: 'email_log_status_enum',
  })
  status: EEmailLogStatus;

  @Column()
  subject: string;

  @Column({ name: 'from_email' })
  from: string;

  @Column({ type: 'jsonb' })
  to: string[];

  @Column({ type: 'jsonb', nullable: true })
  cc?: string[];

  @Column({ type: 'jsonb', nullable: true })
  bcc?: string[];

  @Column({ type: 'text', nullable: true })
  body?: string;

  @Column({ name: 'rendered_body', type: 'text', nullable: true })
  renderedBody?: string;

  @Column({ name: 'template_name', nullable: true })
  templateName?: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments?: Record<string, any>[];

  @Index('IDX_email_logs_scheduled_at')
  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt?: Date;

  @Index('IDX_email_logs_sent_at')
  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt?: Date;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt?: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Index('IDX_email_logs_queue_job_id')
  @Column({ name: 'queue_job_id', nullable: true })
  queueJobId?: string;

  @Index('IDX_email_logs_job_name')
  @Column({ name: 'job_name', nullable: true })
  jobName?: string;

  @Column({ default: 0 })
  attempts: number;

  @Index('IDX_email_logs_created_by_admin_id')
  @Column({ name: 'created_by_admin_id', type: 'bigint', nullable: true })
  createdByAdminId?: AutoIncrementID;

  @ManyToOne(() => AdminUserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_admin_id' })
  createdByAdmin?: Relation<AdminUserEntity>;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  updatedAt: Date;
}
