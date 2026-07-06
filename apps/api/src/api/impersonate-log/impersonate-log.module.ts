import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { SessionEntity } from '@/api/auth/entities/session.entity';
import { AuthSessionService } from '@/api/auth/services/auth-session.service';
import { UserEntity } from '@/api/user/entities/user.entity';
import { QueueName, QueuePrefix } from '@/constants/job.constant';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImpersonateLogHistoryEntity } from './entities/impersonate-log-history.entity';
import { ImpersonateLogEntity } from './entities/impersonate-log.entity';
import { ImpersonateLogController } from './impersonate-log.controller';
import { ImpersonateLogService } from './impersonate-log.service';
import {
  AdminImpersonationController,
  UserImpersonationController,
} from './impersonation.controller';
import { ImpersonationService } from './impersonation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImpersonateLogEntity,
      ImpersonateLogHistoryEntity,
      AdminUserEntity,
      UserEntity,
      SessionEntity,
    ]),
    BullModule.registerQueue({
      name: QueueName.EMAIL,
      prefix: QueuePrefix.AUTH,
    }),
    JwtModule.register({}),
  ],
  controllers: [
    ImpersonateLogController,
    AdminImpersonationController,
    UserImpersonationController,
  ],
  providers: [ImpersonateLogService, ImpersonationService, AuthSessionService],
  exports: [ImpersonateLogService, ImpersonationService],
})
export class ImpersonateLogModule {}
