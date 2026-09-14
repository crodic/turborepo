import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
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

@Entity('admin_accounts')
@Index('UQ_admin_account_provider_account', ['provider', 'providerAccountId'], {
  unique: true,
})
@Index('UQ_admin_account_admin_provider', ['adminUserId', 'provider'], {
  unique: true,
})
export class AdminAccountEntity extends AbstractEntity {
  private previousPassword?: string;

  constructor(data?: Partial<AdminAccountEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_admin_account_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ name: 'admin_user_id', type: 'bigint' })
  adminUserId!: AutoIncrementID;

  @ManyToOne(() => AdminUserEntity, (admin) => admin.accounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'admin_user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_admin_accounts_admin_user_id',
  })
  admin!: Relation<AdminUserEntity>;

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

  @Column({ name: 'two_factor_enabled', default: false })
  twoFactorEnabled!: boolean;

  @Column({ name: 'two_factor_secret', type: 'varchar', nullable: true })
  twoFactorSecret?: string | null;

  @Column({ name: 'two_factor_backup_codes', type: 'jsonb', nullable: true })
  twoFactorBackupCodes?: string[] | null;

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
