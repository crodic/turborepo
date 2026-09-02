import { RoleEntity } from '@/api/role/entities/role.entity';
import { SessionEntity } from '@/api/session/entities/session.entity';
import { TwoFactorEntity } from '@/api/two-factor/entities/two-factor.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { DomainType, UserStatus } from '@/constants/entity.enum';
import { Order } from '@/database/decorators/order.decorator';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { Exclude } from 'class-transformer';
import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { AccountEntity } from './account.entity';
import { AdminProfileEntity } from './admin-profile.entity';
import { UserProfileEntity } from './user-profile.entity';

@Entity('users')
@Index('idx_users_email_domain_unique', ['email', 'domain'], { unique: true })
@Index('idx_users_email', ['email'])
@Index('idx_users_domain_status', ['domain', 'status'])
export class UserEntity extends AbstractEntity {
  @Order(1)
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_users_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Order(2)
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Order(3)
  @Exclude({ toPlainOnly: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  password?: string | null;

  @Order(4)
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'first_name' })
  firstName?: string | null;

  @Order(5)
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'last_name' })
  lastName?: string | null;

  @Order(6)
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'full_name',
    asExpression:
      "TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))",
    generatedType: 'STORED',
    insert: false,
    update: false,
  })
  fullName!: string;

  @Order(7)
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl?: string | null;

  @Order(8)
  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string | null;

  @Order(9)
  @Column({
    type: 'enum',
    enum: DomainType,
    default: DomainType.CLIENT,
  })
  domain!: DomainType;

  @Order(10)
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @Order(11)
  @Column({ type: 'boolean', default: false, name: 'is_email_verified' })
  isEmailVerified!: boolean;

  @Order(12)
  @Column({ type: 'boolean', default: false, name: 'is_phone_verified' })
  isPhoneVerified!: boolean;

  @Order(13)
  @Column({ type: 'varchar', length: 10, nullable: true, default: 'en' })
  locale?: string | null;

  @Order(14)
  @Column({ type: 'timestamptz', nullable: true, name: 'verified_at' })
  verifiedAt?: Date | null;

  @Order(15)
  @Column({ type: 'timestamptz', nullable: true, name: 'last_login_at' })
  lastLoginAt?: Date | null;

  @Order(16)
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @OneToOne(() => AdminProfileEntity, (profile) => profile.user, {
    cascade: true,
    eager: false,
  })
  adminProfile?: Relation<AdminProfileEntity>;

  @OneToOne(() => UserProfileEntity, (profile) => profile.user, {
    cascade: true,
    eager: false,
  })
  userProfile?: Relation<UserProfileEntity>;

  @OneToOne(() => TwoFactorEntity, (twoFactor) => twoFactor.user, {
    cascade: true,
    eager: false,
  })
  twoFactor?: Relation<TwoFactorEntity>;

  @ManyToMany(() => RoleEntity, (role) => role.users, {
    cascade: false,
    eager: false,
  })
  @JoinTable({
    name: 'user_roles',
    joinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_user_roles_user',
    },
    inverseJoinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_user_roles_role',
    },
  })
  roles!: Relation<RoleEntity>[];

  @OneToMany(() => SessionEntity, (session) => session.user, {
    cascade: false,
  })
  sessions?: Relation<SessionEntity>[];

  @OneToMany(() => AccountEntity, (account) => account.user, {
    cascade: false,
  })
  accounts?: Relation<AccountEntity>[];
}
