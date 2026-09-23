import { BackgroundModule } from '@/background/background.module';
import { AllConfigType } from '@/config/config.type';
import { LocationSeedService } from '@/database/seeds/location/location-seed.service';
import { GlobalExceptionFilter } from '@/filters/global-exception.filter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ClassSerializerInterceptor,
  HttpStatus,
  INestApplication,
  Module,
  RequestMethod,
  UnprocessableEntityException,
  ValidationError,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

@Module({})
class TestBackgroundModule {}

describe('Payment Module (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const testCacheManager = {
    get: async () => undefined,
    set: async () => {},
    del: async () => {},
    clear: async () => {},
  };

  const apiV1 = (path: string) => `/api/v1${path}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(BackgroundModule)
      .useModule(TestBackgroundModule)
      .overrideProvider(CACHE_MANAGER)
      .useValue(testCacheManager)
      .overrideProvider(LocationSeedService)
      .useValue({ run: jest.fn().mockResolvedValue(undefined) })
      .compile();

    app = moduleFixture.createNestApplication();

    const configService = app.get<ConfigService<AllConfigType>>(ConfigService);
    const reflector = app.get(Reflector);

    app.setGlobalPrefix(
      configService.getOrThrow('app.apiPrefix', { infer: true }),
      {
        exclude: [{ method: RequestMethod.GET, path: '/' }],
      },
    );
    app.enableVersioning({
      type: VersioningType.URI,
    });
    app.useGlobalFilters(new GlobalExceptionFilter(configService));
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        exceptionFactory: (errors: ValidationError[]) =>
          new UnprocessableEntityException(errors),
      }),
    );
    app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('User Endpoints (/api/v1/payments)', () => {
    it('requires authentication for GET /api/v1/payments/orders', async () => {
      await request(app.getHttpServer())
        .get(apiV1('/payments/orders'))
        .expect(401);
    });

    it('requires authentication for GET /api/v1/payments/subscriptions', async () => {
      await request(app.getHttpServer())
        .get(apiV1('/payments/subscriptions'))
        .expect(401);
    });

    it('validates checkout request payload (missing required fields)', async () => {
      const { body } = await request(app.getHttpServer())
        .post(apiV1('/payments/checkout'))
        .send({})
        .expect(422);

      expect(body).toEqual(
        expect.objectContaining({
          statusCode: 422,
          message: 'Validation failed',
        }),
      );
    });
  });

  describe('Webhook Endpoint (/api/v1/payments/webhook)', () => {
    it('returns 503 when POLAR_WEBHOOK_SECRET is not configured', async () => {
      await request(app.getHttpServer())
        .post(apiV1('/payments/webhook'))
        .set('Content-Type', 'application/json')
        .send({ type: 'order.created', data: {} })
        .expect(503);
    });
  });

  describe('Admin Endpoints (/api/v1/admin/payments)', () => {
    it('protects GET /api/v1/admin/payments/orders with AdminAuthGuard', async () => {
      await request(app.getHttpServer())
        .get(apiV1('/admin/payments/orders'))
        .expect(401);
    });

    it('protects GET /api/v1/admin/payments/transactions with AdminAuthGuard', async () => {
      await request(app.getHttpServer())
        .get(apiV1('/admin/payments/transactions'))
        .expect(401);
    });

    it('protects GET /api/v1/admin/payments/subscriptions with AdminAuthGuard', async () => {
      await request(app.getHttpServer())
        .get(apiV1('/admin/payments/subscriptions'))
        .expect(401);
    });
  });
});
