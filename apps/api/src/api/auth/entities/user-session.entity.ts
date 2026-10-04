import { IAuthSession } from '@/api/auth/interfaces/auth-entity.interface';
import { UserEntity } from '@/api/user/entities/user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

@Entity('user_sessions')
export class UserSessionEntity extends AbstractEntity implements IAuthSession {
  constructor(data?: Partial<UserSessionEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    type: 'bigint',
    primaryKeyConstraintName: 'PK_user_session_id',
  })
  id!: AutoIncrementID;

  @Column({
    name: 'hash',
    type: 'varchar',
    length: 255,
  })
  hash!: string;

  @Index('IDX_user_sessions_user_id')
  @Column({
    name: 'user_id',
    type: 'bigint',
  })
  userId!: AutoIncrementID;

  @ManyToOne(() => UserEntity, (user) => user.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_user_sessions_user_id',
  })
  user!: Relation<UserEntity>;

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

  @Column({
    name: 'expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  expiresAt?: Date;

  @Index('IDX_user_sessions_revoked_at')
  @Column({
    name: 'revoked_at',
    type: 'timestamptz',
    nullable: true,
  })
  revokedAt?: Date;
}
