import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresenceModule } from '../presence/presence.module';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationRealtimeService } from './notification-realtime.service';
import { NotificationSseService } from './notification-sse.service';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, AdminUserEntity]),
    PresenceModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRealtimeService,
    NotificationSseService,
  ],
  exports: [NotificationService, NotificationSseService],
})
export class NotificationModule {}
