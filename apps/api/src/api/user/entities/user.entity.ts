import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { hashPassword as hashPass } from '@/utils/password.util';
import {
  AfterLoad,
  BeforeInsert,
  BeforeUpdate,
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class UserEntity extends AbstractEntity {
  private previousPassword?: string;

  constructor(data?: Partial<UserEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_user_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ length: 100, name: 'first_name', nullable: false })
  firstName!: string;

  @Column({ length: 100, name: 'last_name', nullable: true })
  lastName?: string;

  @Column({
    generatedType: 'STORED',
    asExpression: `first_name || ' ' || last_name`,
    name: 'full_name',
    length: 201,
  })
  fullName!: string;

  @Column()
  @Index('UQ_user_email', { where: '"deleted_at" IS NULL', unique: true })
  email!: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({
    type: 'jsonb',
    default: () => `'{"email": true, "system": true, "security": true}'`,
  })
  notifications!: Record<string, boolean>;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    default: null,
  })
  deletedAt: Date;

  @Column({ type: 'timestamptz', name: 'verified_at', nullable: true })
  verifiedAt?: Date;

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
