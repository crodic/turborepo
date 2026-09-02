import { NotificationModule } from '@/api/notification/notification.module';
import { SessionEntity } from '@/api/session/entities/session.entity';
import { SessionModule } from '@/api/session/session.module';
import { AccountEntity } from '@/api/user/entities/account.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwoFactorEntity } from './entities/two-factor.entity';
import { TwoFactorService } from './two-factor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      TwoFactorEntity,
      AccountEntity,
      SessionEntity,
    ]),
    JwtModule.register({}),
    NotificationModule,
    SessionModule,
  ],
  providers: [TwoFactorService],
  exports: [TwoFactorService, TypeOrmModule],
})
export class TwoFactorModule {}
