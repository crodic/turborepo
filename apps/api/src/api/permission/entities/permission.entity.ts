import { RoleEntity } from '@/api/role/entities/role.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  Entity,
  Index,
  ManyToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

@Entity('admin_permissions')
export class PermissionEntity extends AbstractEntity {
  constructor(data?: Partial<PermissionEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_admin_permission_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column()
  name: string;

  @Column()
  group: string;

  @Column({ nullable: true })
  description?: string;

  @Index('UQ_admin_permissions_key', { unique: true })
  @Column()
  key: string;

  @ManyToMany(() => RoleEntity, (role) => role.permissionEntities)
  roles: Relation<RoleEntity>[];
}
