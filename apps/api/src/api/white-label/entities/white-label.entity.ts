import { UserEntity } from '@/api/user/entities/user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { EWhiteLabelTarget } from '@/constants/entity.enum';
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

export type WhiteLabelStyleProps = Record<string, string | undefined>;

export type WhiteLabelStyles = {
  light: WhiteLabelStyleProps;
  dark: WhiteLabelStyleProps;
};

@Entity('white_labels')
@Index('UQ_white_labels_target_active', ['target'], {
  unique: true,
  where: '"is_active" = TRUE AND "deleted_at" IS NULL',
})
export class WhiteLabelEntity extends AbstractEntity {
  constructor(data?: Partial<WhiteLabelEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_white_label_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Index('UQ_white_labels_slug', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ type: 'varchar' })
  slug!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Index('IDX_white_labels_target')
  @Column({
    type: 'enum',
    enum: EWhiteLabelTarget,
    enumName: 'white_label_target_enum',
    default: EWhiteLabelTarget.ADMIN,
  })
  target!: EWhiteLabelTarget;

  @Index('IDX_white_labels_is_active')
  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive!: boolean;

  @Column({ name: 'brand_name', type: 'varchar', nullable: true })
  brandName?: string | null;

  @Column({ name: 'site_title', type: 'varchar', nullable: true })
  siteTitle?: string | null;

  @Column({ name: 'site_tagline', type: 'varchar', nullable: true })
  siteTagline?: string | null;

  @Column({ name: 'copyright_text', type: 'varchar', nullable: true })
  copyrightText?: string | null;

  @Column({ name: 'site_logo', type: 'varchar', nullable: true })
  siteLogo?: string | null;

  @Column({ name: 'site_dark_logo', type: 'varchar', nullable: true })
  siteDarkLogo?: string | null;

  @Column({ name: 'site_favicon', type: 'varchar', nullable: true })
  siteFavicon?: string | null;

  @Column({ name: 'og_image', type: 'varchar', nullable: true })
  ogImage?: string | null;

  @Column({ name: 'twitter_image', type: 'varchar', nullable: true })
  twitterImage?: string | null;

  @Column({ name: 'meta_title', type: 'varchar', nullable: true })
  metaTitle?: string | null;

  @Column({ name: 'meta_description', type: 'text', nullable: true })
  metaDescription?: string | null;

  @Column({ name: 'canonical_url', type: 'varchar', nullable: true })
  canonicalUrl?: string | null;

  @Column({ type: 'jsonb' })
  styles!: WhiteLabelStyles;

  @Index('IDX_white_labels_created_by_admin_id')
  @Column({ name: 'created_by_admin_id', type: 'bigint', nullable: true })
  createdByAdminId?: AutoIncrementID | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'created_by_admin_id',
    foreignKeyConstraintName: 'FK_white_labels_created_by_admin',
  })
  createdByAdmin?: Relation<UserEntity>;

  @Index('IDX_white_labels_updated_by_admin_id')
  @Column({ name: 'updated_by_admin_id', type: 'bigint', nullable: true })
  updatedByAdminId?: AutoIncrementID | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'updated_by_admin_id',
    foreignKeyConstraintName: 'FK_white_labels_updated_by_admin',
  })
  updatedByAdmin?: Relation<UserEntity>;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    default: null,
  })
  deletedAt?: Date | null;
}
