import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
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

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_notification_id',
    type: 'bigint',
  })
  id: AutoIncrementID;

  @Index('IDX_notifications_admin_id')
  @Column({ name: 'admin_id', type: 'bigint' })
  adminId: AutoIncrementID;

  @ManyToOne(() => AdminUserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_id' })
  admin?: Relation<AdminUserEntity>;

  @Index('IDX_notifications_type')
  @Column({ type: 'varchar', length: 120 })
  type: string;

  @Column({ type: 'varchar', length: 180 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, unknown> | null;

  @Index('IDX_notifications_read_at')
  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt?: Date | null;

  @Index('IDX_notifications_created_at')
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  createdAt: Date;
}
