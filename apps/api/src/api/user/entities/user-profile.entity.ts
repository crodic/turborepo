import { AutoIncrementID } from '@/common/types/common.type';
import { Order } from '@/database/decorators/order.decorator';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_profiles')
@Index('idx_user_profiles_user_id', ['userId'], { unique: true })
export class UserProfileEntity extends AbstractEntity {
  @Order(1)
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_user_profiles_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Order(2)
  @Column({ type: 'bigint', name: 'user_id' })
  userId!: AutoIncrementID;

  @OneToOne(() => UserEntity, (user) => user.userProfile, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_user_profiles_user_id',
  })
  user!: Relation<UserEntity>;

  @Order(3)
  @Column({ type: 'text', nullable: true })
  bio?: string | null;

  @Order(4)
  @Column({ type: 'date', nullable: true })
  birthday?: Date | null;

  @Order(5)
  @Column({ type: 'jsonb', nullable: true })
  notifications?: Record<string, boolean> | null;

  @Order(6)
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;
}
