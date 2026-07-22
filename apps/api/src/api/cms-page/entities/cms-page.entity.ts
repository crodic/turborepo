import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { CmsPageTranslationEntity } from './cms-page-translation.entity';

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

  @Column({
    type: 'enum',
    enum: ECmsPageStatus,
    default: ECmsPageStatus.DRAFT,
  })
  status: ECmsPageStatus;

  @OneToMany(
    () => CmsPageTranslationEntity,
    (translation) => translation.page,
    {
      cascade: true,
      eager: true,
    },
  )
  translations: Relation<CmsPageTranslationEntity[]>;

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
