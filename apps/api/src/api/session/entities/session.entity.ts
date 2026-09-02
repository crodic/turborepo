import { UserEntity } from '@/api/user/entities/user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { DomainType } from '@/constants/entity.enum';
import { Order } from '@/database/decorators/order.decorator';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

@Entity('sessions')
@Index('idx_sessions_user_id', ['userId'])
@Index('idx_sessions_user_id_is_revoked', ['userId', 'isRevoked'])
@Index('idx_sessions_expires_at', ['expiresAt'])
@Index('idx_sessions_domain', ['domain'])
export class SessionEntity extends AbstractEntity {
  @Order(1)
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_sessions_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Order(2)
  @Column({ type: 'bigint', name: 'user_id' })
  userId!: AutoIncrementID;

  @ManyToOne(() => UserEntity, (user) => user.sessions, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_sessions_user_id',
  })
  user?: Relation<UserEntity>;

  @Order(3)
  @Column({
    type: 'enum',
    enum: DomainType,
    default: DomainType.CLIENT,
  })
  domain!: DomainType;

  @Order(4)
  @Exclude({ toPlainOnly: true })
  @Column({ type: 'varchar', length: 255, name: 'refresh_token_hash' })
  refreshTokenHash!: string;

  @Order(5)
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'ip_address' })
  ipAddress?: string | null;

  @Order(6)
  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent?: string | null;

  @Order(7)
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'device_info' })
  deviceInfo?: string | null;

  @Order(8)
  @Column({ type: 'boolean', default: false, name: 'is_revoked' })
  isRevoked!: boolean;

  @Order(9)
  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @Order(10)
  @Column({
    type: 'timestamptz',
    name: 'last_active_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastActiveAt!: Date;
}
