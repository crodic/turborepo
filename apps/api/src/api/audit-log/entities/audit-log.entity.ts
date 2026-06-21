import { AutoIncrementID } from '@/common/types/common.type';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_audit_log_id',
    type: 'bigint',
  })
  id: AutoIncrementID;

  @Index('IDX_audit_logs_entity')
  @Column()
  entity: string;

  @Index('IDX_audit_logs_entity_id')
  @Column({ nullable: true, name: 'entity_id', type: 'bigint' })
  entityId: AutoIncrementID;

  @Column({ type: 'varchar' })
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'SOFT_DELETE' | 'RESTORE';

  @Column('json', { nullable: true, name: 'old_value' })
  oldValue: any;

  @Column('json', { nullable: true, name: 'new_value' })
  newValue: any;

  @Column('text', { nullable: true })
  description: string;

  @Column({ nullable: true, name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ nullable: true })
  ip: string;

  @Column({ nullable: true, name: 'user_agent' })
  userAgent: string;

  @Column({ nullable: true, name: 'request_id' })
  requestId: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({
    name: 'timestamp',
    type: 'timestamptz',
    default: () => 'now()',
  })
  timestamp: Date;
}
