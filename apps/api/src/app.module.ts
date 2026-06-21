import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import authConfig from '@/api/auth/config/auth.config';
import appConfig from '@/config/app.config';
import databaseConfig from '@/database/config/database.config';
import storageConfig from '@/libs/filesystem/config/storage.config';
import mailConfig from '@/mail/config/mail.config';
import redisConfig from '@/redis/config/redis.config';

import { TypeOrmConfigService } from '@/database/typeorm-config.service';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import expressBasicAuth from 'express-basic-auth';

import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { LoggerModule } from 'nestjs-pino';

import { ApiModule } from '@/api/api.module';
import { BackgroundModule } from '@/background/background.module';
import { LibsModule } from '@/libs/libs.module';
import { MailModule } from '@/mail/mail.module';
import { SharedModule } from '@/shared/shared.module';

import { ServeStaticModule } from '@nestjs/serve-static';
import { SentryModule } from '@sentry/nestjs/setup';
import { ClsModule } from 'nestjs-cls';

import { AllConfigType } from '@/config/config.type';
import { Environment } from '@/constants/app.constant';
import path, { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { CommandModule } from './commands/command.module';
import { RequestContextInterceptor } from './interceptors/request-context.interceptor';
import { HttpClientModule } from './libs/nestlens/http-client.module';
import { MonitoringModule } from './libs/nestlens/monitoring.module';
import { RequestIdMiddleware } from './middlewares/request-id.middleware';
import { RedisModule } from './redis/redis.module';
import loggerFactory from './utils/logger-factory';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        authConfig,
        mailConfig,
        storageConfig,
      ],
      envFilePath: ['.env'],
    }),

    // -----------------
    // TYPEORM
    // -----------------
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options: DataSourceOptions) => {
        if (!options) throw new Error('Invalid options passed');
        return new DataSource(options).initialize();
      },
    }),

    // -----------------
    // BULLMQ
    // -----------------
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService<AllConfigType>) => ({
        connection: {
          host: config.getOrThrow('redis.host', { infer: true }),
          port: config.getOrThrow('redis.port', { infer: true }),
          password: config.getOrThrow('redis.password', { infer: true }),
          tls: config.get('redis.tlsEnabled', { infer: true }),
        },
      }),
      inject: [ConfigService],
    }),

    BullBoardModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AllConfigType>) => ({
        route: config.getOrThrow('app.bullBoardPath', { infer: true }),
        adapter: ExpressAdapter,
        middleware: expressBasicAuth({
          users: {
            [config.getOrThrow('auth.adminPanelUsername', {
              infer: true,
            })]: config.getOrThrow('auth.adminPanelPassword', {
              infer: true,
            }),
          },
          challenge: true,
        }),
        boardOptions: {
          uiConfig: {
            boardLogo: {
              path: '/logo.png',
              width: 50,
              height: 50,
            },
            boardTitle: config.getOrThrow('app.name', { infer: true }),
            favIcon: {
              default: '/favicon.png',
              alternative: '/favicon.png',
            },
            environment: config.getOrThrow('app.nodeEnv', { infer: true }),
          },
        },
      }),
    }),

    // -----------------
    // I18N
    // -----------------
    I18nModule.forRootAsync({
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
        new HeaderResolver(['x-lang']),
      ],
      useFactory: (config: ConfigService<AllConfigType>) => {
        const env = config.get('app.nodeEnv', { infer: true });
        const isLocal = env === Environment.LOCAL;
        const isDev = env === Environment.DEVELOPMENT;

        return {
          fallbackLanguage: config.getOrThrow('app.fallbackLanguage', {
            infer: true,
          }),
          loaderOptions: {
            path: path.join(__dirname, './i18n/'),
            watch: isLocal,
          },
          typesOutputPath: path.join(
            __dirname,
            '../src/generated/i18n.generated.ts',
          ),
          logging: isLocal || isDev,
        };
      },
      inject: [ConfigService],
    }),

    // -----------------
    // LOGGER
    // -----------------
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: loggerFactory,
    }),
    RedisModule,

    // -----------------
    // STATIC FILES
    // -----------------
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => [
        {
          rootPath: join(process.cwd(), 'storage', 'public'),
          serveRoot: '/storage/public',
        },
        {
          rootPath: join(process.cwd(), 'public'),
          serveRoot: '/',
        },
        {
          rootPath: join(process.cwd(), 'storage', 'avatars'),
          serveRoot: '/storage/avatars',
        },
      ],
    }),
    ClsModule.forRoot({
      middleware: { mount: true },
      global: true,
    }),
    ScheduleModule.forRoot(),
    SentryModule.forRoot(),
    LibsModule,
    BackgroundModule,
    MailModule,
    ApiModule,
    SharedModule,
    CommandModule,
    HttpClientModule,
    MonitoringModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
  ],
  exports: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
