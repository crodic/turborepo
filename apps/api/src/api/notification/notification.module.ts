import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationRealtimeService } from './notification-realtime.service';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity, AdminUserEntity])],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRealtimeService],
  exports: [NotificationService],
})
export class NotificationModule {}
