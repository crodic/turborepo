import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { IAuthSession } from '@/api/auth/interfaces/auth-entity.interface';
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

@Entity('admin_sessions')
export class AdminSessionEntity extends AbstractEntity implements IAuthSession {
  constructor(data?: Partial<AdminSessionEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    type: 'bigint',
    primaryKeyConstraintName: 'PK_admin_session_id',
  })
  id!: AutoIncrementID;

  @Column({
    name: 'hash',
    type: 'varchar',
    length: 255,
  })
  hash!: string;

  @Index('IDX_admin_sessions_admin_user_id')
  @Column({
    name: 'admin_user_id',
    type: 'bigint',
  })
  adminUserId!: AutoIncrementID;

  @ManyToOne(() => AdminUserEntity, (admin) => admin.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'admin_user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_admin_sessions_admin_user_id',
  })
  admin!: Relation<AdminUserEntity>;

  get userId(): AutoIncrementID {
    return this.adminUserId;
  }

  set userId(val: AutoIncrementID) {
    this.adminUserId = val;
  }

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

  @Index('IDX_admin_sessions_revoked_at')
  @Column({
    name: 'revoked_at',
    type: 'timestamptz',
    nullable: true,
  })
  revokedAt?: Date;
}
