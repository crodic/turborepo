import { UserEntity } from '@/api/user/entities/user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { Order } from '@/database/decorators/order.decorator';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

@Entity('two_factors')
@Index('idx_two_factors_user_id', ['userId'], { unique: true })
export class TwoFactorEntity extends AbstractEntity {
  @Order(1)
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_two_factors_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Order(2)
  @Column({ type: 'bigint', name: 'user_id' })
  userId!: AutoIncrementID;

  @OneToOne(() => UserEntity, (user) => user.twoFactor, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_two_factors_user_id',
  })
  user!: Relation<UserEntity>;

  @Order(3)
  @Column({ type: 'boolean', default: false, name: 'is_enabled' })
  isEnabled!: boolean;

  @Order(4)
  @Exclude({ toPlainOnly: true })
  @Column({ type: 'varchar', nullable: true })
  secret?: string | null;

  @Order(5)
  @Exclude({ toPlainOnly: true })
  @Column({ type: 'jsonb', nullable: true, name: 'backup_codes' })
  backupCodes?: string[] | null;
}
