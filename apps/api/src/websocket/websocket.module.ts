import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { AdminSessionEntity } from '@/api/auth/entities/admin-session.entity';
import { UserSessionEntity } from '@/api/auth/entities/user-session.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WsThrottleGuard } from './guards/ws-throttle.guard';
import { PublicWebsocketGateway } from './public-websocket.gateway';
import { WebsocketAuthService } from './websocket-auth.service';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminUserEntity,
      UserEntity,
      AdminSessionEntity,
      UserSessionEntity,
    ]),
    JwtModule.register({}),
  ],
  providers: [
    WebsocketGateway,
    PublicWebsocketGateway,
    WebsocketAuthService,
    WebsocketService,
    WsThrottleGuard,
  ],
  exports: [WebsocketService, WebsocketAuthService],
})
export class WebsocketModule {}
