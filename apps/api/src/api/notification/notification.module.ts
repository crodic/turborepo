import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { SessionEntity } from '@/api/auth/entities/session.entity';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationAuthService } from './notification-auth.service';
import { NotificationRealtimeService } from './notification-realtime.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationEntity,
      AdminUserEntity,
      SessionEntity,
    ]),
    JwtModule.register({}),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationGateway,
    NotificationAuthService,
    NotificationRealtimeService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
