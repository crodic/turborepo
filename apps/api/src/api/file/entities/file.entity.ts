import { AutoIncrementID } from '@/common/types/common.type';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_file_id',
    type: 'bigint',
  })
  id!: AutoIncrementID;

  @Column()
  @Index('UQ_file_public_id', { unique: true })
  public_id!: string;

  @Column({ type: 'varchar', nullable: true })
  folder: string | null;

  @Column()
  original_name: string;

  @Column()
  path: string;

  @Column()
  hash: string;

  @Column()
  mime: string;

  @Column()
  size: number;

  @Column({ type: 'integer', nullable: true })
  width: number | null;

  @Column({ type: 'integer', nullable: true })
  height: number | null;

  @Column({ type: 'integer', nullable: true })
  duration: number | null;

  @Column()
  resource_type: string;

  @Column()
  status: string;

  get url() {
    const ext = this.path.split('.').pop();
    return `${process.env.APP_URL}/storage/uploads/${this.resource_type}/${this.public_id}.${ext}`;
  }

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  updatedAt: Date;
}
