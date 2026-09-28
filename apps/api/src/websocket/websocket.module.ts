import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { SessionEntity } from '@/api/auth/entities/session.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresenceService } from './presence.service';
import { PublicWebsocketGateway } from './public-websocket.gateway';
import { WebsocketAuthService } from './websocket-auth.service';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUserEntity, UserEntity, SessionEntity]),
    JwtModule.register({}),
  ],
  providers: [
    WebsocketGateway,
    PublicWebsocketGateway,
    WebsocketAuthService,
    WebsocketService,
    PresenceService,
  ],
  exports: [WebsocketService, PresenceService, WebsocketAuthService],
})
export class WebsocketModule {}
