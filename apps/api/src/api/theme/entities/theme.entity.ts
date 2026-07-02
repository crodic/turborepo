import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { EThemeStatus } from '@/constants/entity.enum';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

export type ThemeStyleProps = Record<string, string | undefined>;

export type ThemeStyles = {
  light: ThemeStyleProps;
  dark: ThemeStyleProps;
};

@Entity('themes')
export class ThemeEntity extends AbstractEntity {
  constructor(data?: Partial<ThemeEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_theme_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Index('UQ_themes_slug', { unique: true, where: '"deleted_at" IS NULL' })
  @Column()
  slug: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'jsonb' })
  styles: ThemeStyles;

  @Index('IDX_themes_status')
  @Column({
    type: 'enum',
    enum: EThemeStatus,
    enumName: 'theme_status_enum',
    default: EThemeStatus.DRAFT,
  })
  status: EThemeStatus;

  @Index('IDX_themes_is_default')
  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Index('IDX_themes_created_by_admin_id')
  @Column({ name: 'created_by_admin_id', type: 'bigint', nullable: true })
  createdByAdminId?: AutoIncrementID | null;

  @ManyToOne(() => AdminUserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'created_by_admin_id',
    foreignKeyConstraintName: 'FK_themes_created_by_admin',
  })
  createdByAdmin?: Relation<AdminUserEntity>;

  @Index('IDX_themes_updated_by_admin_id')
  @Column({ name: 'updated_by_admin_id', type: 'bigint', nullable: true })
  updatedByAdminId?: AutoIncrementID | null;

  @ManyToOne(() => AdminUserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'updated_by_admin_id',
    foreignKeyConstraintName: 'FK_themes_updated_by_admin',
  })
  updatedByAdmin?: Relation<AdminUserEntity>;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    default: null,
  })
  deletedAt?: Date | null;
}
