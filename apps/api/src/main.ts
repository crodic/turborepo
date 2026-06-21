import {
  ClassSerializerInterceptor,
  HttpStatus,
  RequestMethod,
  UnprocessableEntityException,
  ValidationError,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import basicAuth from 'express-basic-auth';
import helmet from 'helmet';
import { updateGlobalConfig } from 'nestjs-paginate';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { type AllConfigType } from './config/config.type';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import './instrument';
import setupSwagger from './utils/setup-swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use Pino Logger
  app.useLogger(app.get(Logger));
  // For high-traffic websites in production, it is strongly recommended to offload compression from the application server - typically in a reverse proxy (e.g., Nginx). In that case, you should not use compression middleware.
  app.use(compression());

  // Get all config and setup CORS
  const configService = app.get(ConfigService<AllConfigType>);
  const reflector = app.get('Reflector');
  const isDevelopment =
    configService.getOrThrow('app.nodeEnv', { infer: true }) === 'development';
  const corsOrigin = configService.getOrThrow('app.corsOrigin', {
    infer: true,
  });

  app.use(
    ['/api-docs', '/api-docs-json', '/nestlens'],
    basicAuth({
      users: {
        [configService.getOrThrow('auth.adminPanelUsername', { infer: true })]:
          configService.getOrThrow('auth.adminPanelPassword', { infer: true }),
      },
      challenge: true,
      unauthorizedResponse: 'Unauthorized',
    }),
  );

  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });
  console.info('CORS Origin:', corsOrigin);

  const secureHeaderOrigin = configService.getOrThrow(
    'app.secureHeaderOrigin',
    {
      infer: true,
    },
  );

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: [
            "'self'",
            'data:',
            ...secureHeaderOrigin.split(',').map((s) => s.trim()),
          ],
        },
      },
    }),
  );

  console.log('Secure header for: ', [
    ...secureHeaderOrigin.split(',').map((s) => s.trim()),
  ]);

  // Use global prefix if you don't have subdomain
  app.setGlobalPrefix(
    configService.getOrThrow('app.apiPrefix', { infer: true }),
    {
      exclude: [
        { method: RequestMethod.GET, path: '/' },
        { method: RequestMethod.GET, path: 'health' },
        { method: RequestMethod.GET, path: 'nestlens' },
        { method: RequestMethod.GET, path: 'nestlens/*path' },
        { method: RequestMethod.GET, path: '__nestlens__/*path' },
        { method: RequestMethod.POST, path: '__nestlens__/*path' },
        { method: RequestMethod.PUT, path: '__nestlens__/*path' },
        { method: RequestMethod.DELETE, path: '__nestlens__/*path' },
        'storage/uploads/*path',
      ],
    },
  );

  // Set version for app.
  // EX: /v1/* or /v2/*
  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalFilters(new GlobalExceptionFilter(configService));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: (errors: ValidationError[]) => {
        return new UnprocessableEntityException(errors);
      },
    }),
  );
  // Add a global interceptor so that we can use @Exclude, @Expose, and plainToInstance on DTOs
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  if (isDevelopment) {
    setupSwagger(app);
  }

  updateGlobalConfig({
    // this is default configuration
    defaultOrigin: undefined,
    defaultLimit: 20,
    defaultMaxLimit: 100,
  });

  await app.listen(configService.getOrThrow('app.port', { infer: true }));

  console.info(`Server running on ${await app.getUrl()}`);

  return app;
}

void bootstrap();
