import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestLogEntity } from './entities/request-log.entity';
import { RequestLogController } from './request-log.controller';
import { RequestLogService } from './request-log.service';
import { RequestLoggerMiddleware } from './request-logger.middleware';

@Module({
  imports: [TypeOrmModule.forFeature([RequestLogEntity])],
  controllers: [RequestLogController],
  providers: [RequestLogService],
  exports: [RequestLogService],
})
export class RequestLogModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
