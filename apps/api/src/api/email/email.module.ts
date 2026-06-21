import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { QueueName, QueuePrefix } from '@/constants/job.constant';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationModule } from '../notification/notification.module';
import { EmailLogController } from './email-log.controller';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { EmailLogEntity } from './entities/email-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailLogEntity, AdminUserEntity, UserEntity]),
    NotificationModule,
    BullModule.registerQueue({
      name: QueueName.EMAIL,
      prefix: QueuePrefix.AUTH,
    }),
  ],
  controllers: [EmailController, EmailLogController],
  providers: [EmailService],
  exports: [EmailService, TypeOrmModule],
})
export class EmailModule {}
