import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { CmsPageEntity } from './cms-page.entity';

@Entity('cms_page_translations')
@Index('UQ_cms_page_translations_page_locale', ['pageId', 'locale'], {
  unique: true,
})
@Index('UQ_cms_page_translations_slug', ['slug'], { unique: true })
export class CmsPageTranslationEntity extends AbstractEntity {
  constructor(data?: Partial<CmsPageTranslationEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_cms_page_translation_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ name: 'page_id', type: 'bigint' })
  pageId: AutoIncrementID;

  @ManyToOne(() => CmsPageEntity, (page) => page.translations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'page_id' })
  page: Relation<CmsPageEntity>;

  @Column()
  locale: string;

  @Column()
  slug: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

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
}
