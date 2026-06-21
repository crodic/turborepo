import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { SessionEntity } from '@/api/auth/entities/session.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresenceAuthService } from './presence-auth.service';
import { PresenceGateway } from './presence.gateway';
import { PresenceService } from './presence.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUserEntity, UserEntity, SessionEntity]),
    JwtModule.register({}),
  ],
  providers: [PresenceGateway, PresenceService, PresenceAuthService],
  exports: [PresenceService],
})
export class PresenceModule {}
