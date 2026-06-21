import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
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

export enum ECmsPageStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

@Entity('cms_pages')
export class CmsPageEntity extends AbstractEntity {
  constructor(data?: Partial<CmsPageEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_cms_page_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column()
  title: string;

  @Index('UQ_cms_pages_slug', { unique: true, where: '"deleted_at" IS NULL' })
  @Column()
  slug: string;

  @Column({
    type: 'enum',
    enum: ECmsPageStatus,
    default: ECmsPageStatus.DRAFT,
  })
  status: ECmsPageStatus;

  @Column({ name: 'content', type: 'jsonb' })
  content: Record<string, unknown>;

  @Column({ name: 'variables', type: 'jsonb', default: () => "'[]'::jsonb" })
  variables: unknown[];

  @Column({ name: 'seo_title', nullable: true })
  seoTitle?: string;

  @Column({ name: 'seo_description', type: 'text', nullable: true })
  seoDescription?: string;

  @Column({ name: 'seo_keywords', nullable: true })
  seoKeywords?: string;

  @Column({ name: 'og_title', nullable: true })
  ogTitle?: string;

  @Column({ name: 'og_description', type: 'text', nullable: true })
  ogDescription?: string;

  @Column({ name: 'og_image', nullable: true })
  ogImage?: string;

  @Column({ name: 'canonical_url', nullable: true })
  canonicalUrl?: string;

  @Column({ name: 'robots', nullable: true })
  robots?: string;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy?: AutoIncrementID;

  @ManyToOne(() => AdminUserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdByAdmin?: Relation<AdminUserEntity>;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy?: AutoIncrementID;

  @ManyToOne(() => AdminUserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updatedByAdmin?: Relation<AdminUserEntity>;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    default: null,
  })
  deletedAt?: Date;
}
