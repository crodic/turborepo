import { BackgroundModule } from '@/background/background.module';
import { AllConfigType } from '@/config/config.type';
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
import { AppModule } from './../src/app.module';

@Module({})
class TestBackgroundModule {}

describe('App (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const cacheStore = new Map<string, unknown>();
  const testCacheManager = {
    get: async <T>(key: string): Promise<T> => cacheStore.get(key) as T,
    set: async (key: string, value: unknown): Promise<void> => {
      cacheStore.set(key, value);
    },
    del: async (key: string): Promise<void> => {
      cacheStore.delete(key);
    },
    clear: async (): Promise<void> => {
      cacheStore.clear();
    },
  };

  const api = (path: string) => `/api${path}`;
  const apiV1 = (path: string) => `/api/v1${path}`;

  const cleanDatabase = async () => {
    if (!dataSource?.isInitialized) {
      return;
    }

    await dataSource.query(`
      TRUNCATE TABLE
        "sessions",
        "users",
        "admin_user_role",
        "role_permission",
        "admin_users",
        "roles",
        "permissions",
        "audit_logs",
        "settings",
        "files"
      RESTART IDENTITY CASCADE
    `);
    await testCacheManager.clear();
  };

  const configureApp = (nestApp: INestApplication) => {
    const configService =
      nestApp.get<ConfigService<AllConfigType>>(ConfigService);
    const reflector = nestApp.get(Reflector);

    nestApp.setGlobalPrefix(
      configService.getOrThrow('app.apiPrefix', { infer: true }),
      {
        exclude: [{ method: RequestMethod.GET, path: '/' }],
      },
    );
    nestApp.enableVersioning({
      type: VersioningType.URI,
    });
    nestApp.useGlobalFilters(new GlobalExceptionFilter(configService));
    nestApp.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        exceptionFactory: (errors: ValidationError[]) =>
          new UnprocessableEntityException(errors),
      }),
    );
    nestApp.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(BackgroundModule)
      .useModule(TestBackgroundModule)
      .overrideProvider(CACHE_MANAGER)
      .useValue(testCacheManager)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.runMigrations({ transaction: 'all' });
    await cleanDatabase();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanDatabase();
    await app?.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Welcome to the API');
  });

  describe('system setup and admin auth', () => {
    const adminEmail = 'admin.e2e@example.com';
    const adminPassword = 'Admin123!';

    it('reports uninitialized state before setup', async () => {
      const { body } = await request(app.getHttpServer())
        .get(apiV1('/setup/status'))
        .expect(200);

      expect(body).toEqual({
        initialized: false,
        message: 'System has not been initialized',
      });
    });

    it('validates setup payloads', async () => {
      const { body } = await request(app.getHttpServer())
        .post(apiV1('/setup'))
        .send({ email: 'not-an-email', password: 'Admin123!' })
        .expect(422);

      expect(body).toEqual(
        expect.objectContaining({
          statusCode: 422,
          message: 'Validation failed',
        }),
      );
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ property: 'email' }),
        ]),
      );
    });

    it('sets up the system once, logs in, and protects admin profile APIs', async () => {
      await request(app.getHttpServer())
        .post(apiV1('/setup'))
        .send({ email: adminEmail, password: adminPassword })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({
            success: true,
            message: 'System initialized successfully',
          });
        });

      await request(app.getHttpServer())
        .post(apiV1('/setup'))
        .send({ email: 'second-admin@example.com', password: adminPassword })
        .expect(403);

      await request(app.getHttpServer()).get(apiV1('/auth/me')).expect(401);

      const loginResponse = await request(app.getHttpServer())
        .post(apiV1('/auth/login'))
        .send({ email: adminEmail, password: adminPassword })
        .expect(200);

      expect(loginResponse.body).toEqual(
        expect.objectContaining({
          userId: expect.any(String),
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          tokenExpires: expect.any(Number),
        }),
      );

      await request(app.getHttpServer())
        .get(apiV1('/auth/me'))
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual(
            expect.objectContaining({
              id: loginResponse.body.userId,
              email: adminEmail,
            }),
          );
        });
    });
  });

  describe('admin protected user CRUD', () => {
    let adminAccessToken: string;

    beforeAll(async () => {
      await cleanDatabase();

      await request(app.getHttpServer())
        .post(apiV1('/setup'))
        .send({
          email: 'crud-admin.e2e@example.com',
          password: 'Admin123!',
        })
        .expect(200);

      const loginResponse = await request(app.getHttpServer())
        .post(apiV1('/auth/login'))
        .send({
          email: 'crud-admin.e2e@example.com',
          password: 'Admin123!',
        })
        .expect(200);

      adminAccessToken = loginResponse.body.accessToken;
    });

    it('rejects unauthenticated access to protected user APIs', async () => {
      await request(app.getHttpServer()).get(apiV1('/users')).expect(401);
    });

    it('rejects invalid create-user payloads before service logic runs', async () => {
      const { body } = await request(app.getHttpServer())
        .post(apiV1('/users'))
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'bad-email',
          password: 'secret1',
          confirmPassword: 'secret1',
        })
        .expect(422);

      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ property: 'email' }),
        ]),
      );
    });

    it('creates, reads, updates, deletes, and then returns not found for a user', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(apiV1('/users'))
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          firstName: 'Customer',
          lastName: 'One',
          email: 'customer.one@example.com',
          password: 'User123!',
          confirmPassword: 'User123!',
        })
        .expect(201);

      expect(createResponse.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          firstName: 'Customer',
          lastName: 'One',
          email: 'customer.one@example.com',
        }),
      );

      const userId = createResponse.body.id;

      await request(app.getHttpServer())
        .get(apiV1(`/users/${userId}`))
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual(
            expect.objectContaining({
              id: userId,
              email: 'customer.one@example.com',
            }),
          );
        });

      await request(app.getHttpServer())
        .put(apiV1(`/users/${userId}`))
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          firstName: 'Customer',
          lastName: 'Updated',
          confirmPassword: 'Ignored123!',
        })
        .expect(200);

      await request(app.getHttpServer())
        .get(apiV1(`/users/${userId}`))
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.lastName).toBe('Updated');
        });

      await request(app.getHttpServer())
        .delete(apiV1(`/users/${userId}`))
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(apiV1(`/users/${userId}`))
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);
    });
  });
});
