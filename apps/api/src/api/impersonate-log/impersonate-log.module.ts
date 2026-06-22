import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImpersonateLogHistoryEntity } from './entities/impersonate-log-history.entity';
import { ImpersonateLogEntity } from './entities/impersonate-log.entity';
import { ImpersonateLogController } from './impersonate-log.controller';
import { ImpersonateLogService } from './impersonate-log.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImpersonateLogEntity,
      ImpersonateLogHistoryEntity,
      AdminUserEntity,
      UserEntity,
    ]),
  ],
  controllers: [ImpersonateLogController],
  providers: [ImpersonateLogService],
  exports: [ImpersonateLogService],
})
export class ImpersonateLogModule {}
