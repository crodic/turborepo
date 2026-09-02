import { RoleEntity } from '@/api/role/entities/role.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { EmailQueueService } from '@/background/queues/email-queue/email-queue.service';
import { AllConfigType } from '@/config/config.type';
import { SUPER_ADMIN_ACCOUNT } from '@/constants/app.constant';
import { AdminSeedService } from '@/database/seeds/admin/admin-seed.service';
import { SeedModule } from '@/database/seeds/seed.module';
import { GlobalExceptionFilter } from '@/filters/global-exception.filter';
import {
  ClassSerializerInterceptor,
  HttpStatus,
  INestApplication,
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

describe('App (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminSeedService: AdminSeedService;
  let superAdminToken: string;
  let superAdminRole: RoleEntity;

  const apiV1 = (path: string) => `/api/v1${path}`;

  const cleanDatabase = async () => {
    if (!dataSource?.isInitialized) {
      return;
    }

    await dataSource.query(`
      DELETE FROM "sessions";
      DELETE FROM "two_factors";
      DELETE FROM "accounts";
      DELETE FROM "admin_profiles";
      DELETE FROM "user_profiles";
      DELETE FROM "user_roles";
      DELETE FROM "users";
      DELETE FROM "audit_logs";
      DELETE FROM "settings";
      DELETE FROM "files";
    `);
  };

  const configureApp = (nestApp: INestApplication) => {
    const config = nestApp.get<ConfigService<AllConfigType>>(ConfigService);
    const reflector = nestApp.get(Reflector);

    nestApp.setGlobalPrefix(
      config.getOrThrow('app.apiPrefix', { infer: true }),
      {
        exclude: [
          { method: RequestMethod.GET, path: '/' },
          { method: RequestMethod.GET, path: '/health' },
        ],
      },
    );
    nestApp.enableVersioning({
      type: VersioningType.URI,
    });
    nestApp.useGlobalFilters(new GlobalExceptionFilter(config));
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
      imports: [AppModule, SeedModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    const emailQueueService = app.get(EmailQueueService);
    jest
      .spyOn(emailQueueService, 'sendAdminEmailVerification')
      .mockResolvedValue(undefined);
    jest
      .spyOn(emailQueueService, 'sendUserEmailVerification')
      .mockResolvedValue(undefined);

    dataSource = app.get(DataSource);
    adminSeedService = app.get(AdminSeedService);

    await dataSource.runMigrations({ transaction: 'all' });
    await cleanDatabase();
    await adminSeedService.run();

    const roleRepo = dataSource.getRepository(RoleEntity);
    superAdminRole = (await roleRepo.findOne({ where: { isSystem: true } }))!;

    const loginRes = await request(app.getHttpServer())
      .post(apiV1('/auth/login'))
      .send({
        email: SUPER_ADMIN_ACCOUNT.email,
        password: SUPER_ADMIN_ACCOUNT.password,
      })
      .expect(HttpStatus.OK);

    superAdminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await cleanDatabase();
    if (app) {
      await app.close();
    }
  });

  describe('1. Health and Root Endpoints', () => {
    it('GET / - returns welcome message', async () => {
      const response = await request(app.getHttpServer())
        .get('/')
        .expect(HttpStatus.OK);

      expect(response.text).toBe('Welcome to the API');
    });

    it('GET /health - returns healthy status and db connection', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.OK);

      expect(response.body.status).toBe('ok');
      expect(response.body.info.database.status).toBe('up');
    });
  });

  describe('2. Admin Authentication Flow', () => {
    const adminEmail = `new_admin_${Date.now()}@example.com`;
    const adminPassword = 'AdminPassword123!';
    let adminAccessToken: string;
    let adminRefreshToken: string;
    let adminId: string;

    it('2.1 Should register a new admin account with roles', async () => {
      const response = await request(app.getHttpServer())
        .post(apiV1('/auth/register'))
        .send({
          email: adminEmail,
          password: adminPassword,
          first_name: 'Super',
          last_name: 'Admin',
          roleIds: [String(superAdminRole.id)],
        })
        .expect(HttpStatus.OK);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.userId).toBeDefined();
      adminId = String(response.body.userId);

      const userRepo = dataSource.getRepository(UserEntity);
      await userRepo.update(
        { id: adminId as any },
        { isEmailVerified: true, verifiedAt: new Date() },
      );
    });

    it('2.2 Should login with valid admin credentials', async () => {
      const response = await request(app.getHttpServer())
        .post(apiV1('/auth/login'))
        .send({
          email: adminEmail,
          password: adminPassword,
        })
        .expect(HttpStatus.OK);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.userId).toBe(adminId);

      adminAccessToken = response.body.accessToken;
      adminRefreshToken = response.body.refreshToken;
    });

    it('2.3 Should get admin profile (/auth/me)', async () => {
      const response = await request(app.getHttpServer())
        .get(apiV1('/auth/me'))
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(adminId);
      expect(response.body.email).toBe(adminEmail);
    });

    it('2.4 Should refresh admin token', async () => {
      const response = await request(app.getHttpServer())
        .post(apiV1('/auth/refresh'))
        .send({ refreshToken: adminRefreshToken })
        .expect(HttpStatus.OK);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('2.5 Should check 2FA status for admin', async () => {
      const response = await request(app.getHttpServer())
        .get(apiV1('/auth/two-factor/status'))
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({ enabled: false });
    });
  });

  describe('3. Client User Authentication Flow', () => {
    const userEmail = `client_${Date.now()}@example.com`;
    const userPassword = 'ClientPassword123!';
    let userAccessToken: string;

    it('3.1 Should register a client user', async () => {
      const response = await request(app.getHttpServer())
        .post(apiV1('/user/auth/register'))
        .send({
          email: userEmail,
          password: userPassword,
          firstName: 'Client',
          lastName: 'User',
        })
        .expect(HttpStatus.OK);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.userId).toBeDefined();

      const userRepo = dataSource.getRepository(UserEntity);
      await userRepo.update(
        { id: response.body.userId as any },
        { isEmailVerified: true, verifiedAt: new Date() },
      );
    });

    it('3.2 Should login as client user', async () => {
      const response = await request(app.getHttpServer())
        .post(apiV1('/user/auth/login'))
        .send({
          email: userEmail,
          password: userPassword,
        })
        .expect(HttpStatus.OK);

      expect(response.body.accessToken).toBeDefined();
      userAccessToken = response.body.accessToken;
    });

    it('3.3 Should get client profile (/user/auth/me)', async () => {
      const response = await request(app.getHttpServer())
        .get(apiV1('/user/auth/me'))
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.email).toBe(userEmail);
    });
  });

  describe('4. Admin User Management CRUD', () => {
    let createdUserId: string;
    const testTargetEmail = `managed_${Date.now()}@example.com`;

    it('4.1 Rejects unauthenticated access to /users', async () => {
      await request(app.getHttpServer())
        .get(apiV1('/users'))
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('4.2 Rejects invalid create-user payload with 422', async () => {
      await request(app.getHttpServer())
        .post(apiV1('/users'))
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'not-an-email',
          password: '123',
        })
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    it('4.3 Creates a user via admin endpoint', async () => {
      const response = await request(app.getHttpServer())
        .post(apiV1('/users'))
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: testTargetEmail,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.id).toBeDefined();
      expect(response.body.email).toBe(testTargetEmail);
      createdUserId = String(response.body.id);
    });

    it('4.4 Reads user by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(apiV1(`/users/${createdUserId}`))
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(createdUserId);
      expect(response.body.email).toBe(testTargetEmail);
    });

    it('4.5 Updates user by ID', async () => {
      const response = await request(app.getHttpServer())
        .put(apiV1(`/users/${createdUserId}`))
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          firstName: 'Johnny',
        })
        .expect(HttpStatus.OK);

      expect(response.body.firstName).toBe('Johnny');
    });

    it('4.6 Deletes user by ID', async () => {
      await request(app.getHttpServer())
        .delete(apiV1(`/users/${createdUserId}`))
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .get(apiV1(`/users/${createdUserId}`))
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
