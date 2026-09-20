import { AutoIncrementID } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { FileEntity } from './file.entity';

@Entity('file_folders')
export class FileFolderEntity extends AbstractEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_file_folder_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column({ type: 'varchar', length: 255 })
  @Index('UQ_file_folder_name', { unique: true })
  name: string;

  @OneToMany(() => FileEntity, (file) => file.folderRelation)
  files?: Relation<FileEntity[]>;
}
