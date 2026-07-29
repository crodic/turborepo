import { AutoIncrementID } from '@/common/types/common.type';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('request_logs')
export class RequestLogEntity {
  @PrimaryGeneratedColumn('increment', {
    primaryKeyConstraintName: 'PK_request_log_id',
    type: 'bigint',
  })
  id: AutoIncrementID;

  @Index('IDX_request_logs_method')
  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Index('IDX_request_logs_path')
  @Column({ type: 'varchar' })
  path: string;

  @Index('IDX_request_logs_status')
  @Column({ type: 'int' })
  status: number;

  @Index('IDX_request_logs_ip')
  @Column({ type: 'varchar', nullable: true })
  ip: string;

  @Column({ type: 'varchar', nullable: true })
  browser: string;

  @Column({ type: 'varchar', nullable: true })
  os: string;

  @Column({ type: 'varchar', nullable: true })
  device: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ type: 'varchar', nullable: true })
  source: string;

  @Column({ type: 'int', nullable: true })
  duration: number;

  @Column({ type: 'varchar', nullable: true })
  userId: string;

  @Column({ type: 'varchar', nullable: true })
  guard: string;

  @CreateDateColumn({
    name: 'timestamp',
    type: 'timestamptz',
    default: () => 'now()',
  })
  timestamp: Date;
}
