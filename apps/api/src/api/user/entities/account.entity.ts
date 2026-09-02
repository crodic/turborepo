import { AutoIncrementID } from '@/common/types/common.type';
import { EAccountProvider } from '@/constants/entity.enum';
import { Order } from '@/database/decorators/order.decorator';
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
import { UserEntity } from './user.entity';

@Entity('accounts')
@Index('idx_accounts_user_id', ['userId'])
@Index(
  'idx_accounts_provider_provider_account_id_unique',
  ['provider', 'providerAccountId'],
  {
    unique: true,
  },
)
@Index('idx_accounts_provider', ['provider'])
export class AccountEntity extends AbstractEntity {
  @Order(1)
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_accounts_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Order(2)
  @Column({ type: 'bigint', name: 'user_id' })
  userId!: AutoIncrementID;

  @Order(3)
  @Column({ type: 'varchar', length: 50, default: 'credentials' })
  type!: string;

  @Order(4)
  @Column({
    type: 'enum',
    enum: EAccountProvider,
    default: EAccountProvider.LOCAL,
  })
  provider!: EAccountProvider;

  @Order(5)
  @Column({ type: 'varchar', length: 255, name: 'provider_account_id' })
  providerAccountId!: string;

  @Order(6)
  @Column({ type: 'text', nullable: true, name: 'refresh_token' })
  refreshToken?: string | null;

  @Order(7)
  @Column({ type: 'text', nullable: true, name: 'access_token' })
  accessToken?: string | null;

  @Order(8)
  @Column({ type: 'timestamptz', nullable: true, name: 'token_expires_at' })
  tokenExpiresAt?: Date | null;

  @Order(9)
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'token_type' })
  tokenType?: string | null;

  @Order(10)
  @Column({ type: 'varchar', length: 500, nullable: true })
  scope?: string | null;

  @Order(11)
  @Column({ type: 'text', nullable: true, name: 'id_token' })
  idToken?: string | null;

  @Order(12)
  @Column({ type: 'jsonb', nullable: true, name: 'profile_data' })
  profileData?: Record<string, unknown> | null;

  @ManyToOne(() => UserEntity, (user) => user.accounts, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_accounts_user_id',
  })
  user!: Relation<UserEntity>;
}
