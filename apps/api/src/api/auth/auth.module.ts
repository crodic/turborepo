import { TwoFactorEntity } from '@/api/two-factor/entities/two-factor.entity';
import { TwoFactorModule } from '@/api/two-factor/two-factor.module';
import { AccountEntity } from '@/api/user/entities/account.entity';
import { AdminProfileEntity } from '@/api/user/entities/admin-profile.entity';
import { UserProfileEntity } from '@/api/user/entities/user-profile.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { UserModule } from '@/api/user/user.module';
import { EmailQueueModule } from '@/background/queues/email-queue/email-queue.module';
import { QueueName, QueuePrefix } from '@/constants/job.constant';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationModule } from '../notification/notification.module';
import { AdminAuthenticationController } from './controllers/admin-auth.controller';
import { UserAuthenticationController } from './controllers/user-auth.controller';
import { AuthService } from './services/auth.service';
import { SocialAuthService } from './services/social-auth.service';
import { GoogleOAuthAdapter } from './social/google-oauth.adapter';
import { GoogleStrategy } from './strategy/google.strategy';
import { JwtStrategy } from './strategy/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      AdminProfileEntity,
      UserProfileEntity,
      TwoFactorEntity,
      AccountEntity,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    NotificationModule,
    EmailQueueModule,
    UserModule,
    TwoFactorModule,
    JwtModule.register({}),
    BullModule.registerQueue({
      name: QueueName.EMAIL,
      prefix: QueuePrefix.AUTH,
      streams: {
        events: {
          maxLen: 1000,
        },
      },
    }),
    BullBoardModule.forFeature({
      name: QueueName.EMAIL,
      adapter: BullMQAdapter,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
  ],
  controllers: [AdminAuthenticationController, UserAuthenticationController],
  providers: [
    AuthService,
    SocialAuthService,
    JwtStrategy,
    GoogleStrategy,
    GoogleOAuthAdapter,
  ],
  exports: [AuthService, SocialAuthService],
})
export class AuthModule {}
