import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { PermissionEntity } from '@/api/permission/entities/permission.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

@Entity('roles')
export class RoleEntity extends AbstractEntity {
  constructor(data?: Partial<RoleEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_role_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Index('UQ_roles_name', { unique: true, where: '"deleted_at" IS NULL' })
  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @ManyToMany(() => PermissionEntity, (permission) => permission.roles, {
    eager: true,
  })
  @JoinTable({
    name: 'role_permission',
    joinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'permission_id',
      referencedColumnName: 'id',
    },
  })
  permissionEntities: Relation<PermissionEntity>[];

  @ManyToMany(() => AdminUserEntity, (user) => user.roles)
  admins: Relation<AdminUserEntity>[];

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    default: null,
  })
  deletedAt: Date;
}
