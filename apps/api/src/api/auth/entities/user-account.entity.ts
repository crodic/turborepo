import { UserEntity } from '@/api/user/entities/user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { EAccountProvider } from '@/constants/entity.enum';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { hashPassword as hashPass } from '@/utils/password.util';
import {
  AfterLoad,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

@Entity('user_accounts')
@Index('UQ_user_account_provider_account', ['provider', 'providerAccountId'], {
  unique: true,
})
@Index('UQ_user_account_user_provider', ['userId', 'provider'], {
  unique: true,
})
export class UserAccountEntity extends AbstractEntity {
  private previousPassword?: string;

  constructor(data?: Partial<UserAccountEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_user_account_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: AutoIncrementID;

  @ManyToOne(() => UserEntity, (user) => user.accounts, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_user_accounts_user_id',
  })
  user!: Relation<UserEntity>;

  @Column({
    enum: EAccountProvider,
    type: 'enum',
    default: EAccountProvider.LOCAL,
  })
  provider!: EAccountProvider;

  @Column({ length: 255, name: 'provider_account_id' })
  providerAccountId!: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ default: false, name: 'email_verified' })
  emailVerified!: boolean;

  @Column({ length: 255, name: 'display_name', nullable: true })
  displayName?: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && this.password !== this.previousPassword) {
      this.password = await hashPass(this.password);
    }
  }

  @AfterLoad()
  private loadPreviousPassword() {
    this.previousPassword = this.password;
  }
}
