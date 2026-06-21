import { UserEntity } from '@/api/user/entities/user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { EOAuthProvider } from '@/constants/entity.enum';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('user_social_accounts')
@Index(
  'UQ_user_social_account_provider_account',
  ['provider', 'providerAccountId'],
  {
    unique: true,
  },
)
@Index('UQ_user_social_account_user_provider', ['userId', 'provider'], {
  unique: true,
})
export class UserSocialAccountEntity extends AbstractEntity {
  constructor(data?: Partial<UserSocialAccountEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_user_social_account_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: AutoIncrementID;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_user_social_accounts_user_id',
  })
  user!: UserEntity;

  @Column({ enum: EOAuthProvider, type: 'enum' })
  provider!: EOAuthProvider;

  @Column({ length: 255, name: 'provider_account_id' })
  providerAccountId!: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ default: false, name: 'email_verified' })
  emailVerified!: boolean;

  @Column({ length: 255, name: 'display_name', nullable: true })
  displayName?: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;
}
