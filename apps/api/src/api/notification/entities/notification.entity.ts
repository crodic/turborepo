import { UserEntity } from '@/api/user/entities/user.entity';
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

  @Index('IDX_notifications_user_id')
  @Column({ name: 'user_id', type: 'bigint' })
  userId: AutoIncrementID;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_notifications_user',
  })
  user?: Relation<UserEntity>;

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
