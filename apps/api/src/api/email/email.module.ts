import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailLogController } from './email-log.controller';
import { EmailService } from './email.service';
import { EmailLogEntity } from './entities/email-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmailLogEntity])],
  controllers: [EmailLogController],
  providers: [EmailService],
  exports: [EmailService, TypeOrmModule],
})
export class EmailModule {}
