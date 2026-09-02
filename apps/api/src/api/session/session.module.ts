import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionEntity } from './entities/session.entity';
import { SessionService } from './session.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SessionEntity])],
  providers: [SessionService],
  exports: [SessionService, TypeOrmModule],
})
export class SessionModule {}
