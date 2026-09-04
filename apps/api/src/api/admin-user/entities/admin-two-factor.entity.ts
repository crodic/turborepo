import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { AdminUserEntity } from './admin-user.entity';

@Entity('admin_two_factors')
export class AdminTwoFactorEntity extends AbstractEntity {
  constructor(data?: Partial<AdminTwoFactorEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_admin_two_factor_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ name: 'admin_user_id', type: 'bigint' })
  adminUserId!: AutoIncrementID;

  @OneToOne(() => AdminUserEntity, (admin) => admin.twoFactor, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'admin_user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_admin_two_factors_admin_user_id',
  })
  adminUser!: Relation<AdminUserEntity>;

  @Column({ name: 'secret', type: 'varchar' })
  secret!: string;

  @Column({ name: 'backup_codes', type: 'jsonb', nullable: true })
  backupCodes?: string[] | null;

  @Column({ name: 'is_enabled', default: true })
  isEnabled!: boolean;
}
