import { PermissionEntity } from '@/api/permission/entities/permission.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { DomainType } from '@/constants/entity.enum';
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
@Index('idx_roles_code_domain_unique', ['code', 'domain'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
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

  @Column({ length: 100 })
  code: string;

  @Column({ length: 150 })
  name: string;

  @Column({
    type: 'enum',
    enum: DomainType,
    default: DomainType.CLIENT,
  })
  domain: DomainType;

  @Column({ nullable: true })
  description?: string;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @ManyToMany(() => PermissionEntity, (permission) => permission.roles, {
    eager: true,
  })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_role_permissions_role',
    },
    inverseJoinColumn: {
      name: 'permission_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_role_permissions_permission',
    },
  })
  permissionEntities: Relation<PermissionEntity>[];

  @ManyToMany(() => UserEntity, (user) => user.roles)
  users: Relation<UserEntity>[];

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    default: null,
  })
  deletedAt: Date;
}
