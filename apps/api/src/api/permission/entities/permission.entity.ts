import { RoleEntity } from '@/api/role/entities/role.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { DomainType } from '@/constants/entity.enum';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  Entity,
  Index,
  ManyToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

@Entity('permissions')
@Index('idx_permissions_domain', ['domain'])
export class PermissionEntity extends AbstractEntity {
  constructor(data?: Partial<PermissionEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_permission_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column()
  name: string;

  @Column({ default: 'general' })
  group: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Index('UQ_permissions_key', { unique: true })
  @Column()
  key: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  action?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  subject?: string;

  @Column({
    type: 'enum',
    enum: DomainType,
    nullable: true,
  })
  domain?: DomainType;

  @ManyToMany(() => RoleEntity, (role) => role.permissionEntities)
  roles: Relation<RoleEntity>[];
}
