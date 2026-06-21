import { CacheKey } from '@/constants/cache.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { JobName, QueueName } from '@/constants/job.constant';
import { createCacheKey } from '@/utils/cache.util';
import { getQueueToken } from '@nestjs/bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClsService } from 'nestjs-cls';
import { Repository } from 'typeorm';
import { RoleEntity } from '../role/entities/role.entity';
import { SettingsService } from '../settings/settings.service';
import { AdminUserService } from './admin-user.service';
import { AdminUserEntity } from './entities/admin-user.entity';

describe('AdminUserService', () => {
  let service: AdminUserService;

  let adminRepoMock: Partial<
    Record<keyof Repository<AdminUserEntity>, jest.Mock>
  >;
  let roleRepoMock: Partial<Record<keyof Repository<RoleEntity>, jest.Mock>>;
  let cacheMock: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let jwtServiceMock: { signAsync: jest.Mock };
  let configServiceMock: { getOrThrow: jest.Mock };
  let emailQueueMock: { add: jest.Mock };

  beforeAll(async () => {
    adminRepoMock = {
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      findOneOrFail: jest.fn(),
      findOneByOrFail: jest.fn(),
      findOneBy: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    roleRepoMock = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      findBy: jest.fn(),
    };

    cacheMock = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    jwtServiceMock = {
      signAsync: jest.fn(),
    };
    configServiceMock = {
      getOrThrow: jest.fn(),
    };
    emailQueueMock = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUserService,
        {
          provide: getRepositoryToken(AdminUserEntity),
          useValue: adminRepoMock,
        },
        {
          provide: getRepositoryToken(RoleEntity),
          useValue: roleRepoMock,
        },
        {
          provide: ClsService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheMock,
        },
        {
          provide: SettingsService,
          useValue: {
            get: jest.fn(),
            all: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: getQueueToken(QueueName.EMAIL),
          useValue: emailQueueMock,
        },
      ],
    }).compile();

    service = module.get<AdminUserService>(AdminUserService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jwtServiceMock.signAsync.mockResolvedValue('verify-token');
    configServiceMock.getOrThrow.mockImplementation((key: string) => {
      if (key === 'auth.confirmEmailSecret') return 'confirm-secret';
      if (key === 'auth.confirmEmailExpires') return '1d';

      return undefined;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hasAdmin', () => {
    it('returns cached initialized state', async () => {
      cacheMock.get.mockResolvedValue(true);

      await expect(service.hasAdmin()).resolves.toBe(true);

      expect(adminRepoMock.count).not.toHaveBeenCalled();
    });

    it('counts admins and caches the result on cache miss', async () => {
      cacheMock.get.mockResolvedValue(undefined);
      adminRepoMock.count.mockResolvedValue(0);

      await expect(service.hasAdmin()).resolves.toBe(false);

      expect(cacheMock.set).toHaveBeenCalledWith(
        CacheKey.SYSTEM_HAS_ADMIN,
        false,
        60000,
      );
    });
  });

  describe('create', () => {
    const dto = {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: 'secret1',
      roleIds: ['1' as any],
    };

    it('creates an admin user with resolved roles', async () => {
      const role = new RoleEntity({ id: '1' as any, name: 'Admin' });
      const savedAdmin = new AdminUserEntity({
        id: '2' as any,
        ...dto,
        roles: [role],
      });

      adminRepoMock.findOne.mockResolvedValue(null);
      roleRepoMock.findBy.mockResolvedValue([role]);
      adminRepoMock.save.mockResolvedValue(savedAdmin);

      const result = await service.create(dto);

      expect(adminRepoMock.findOne).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(adminRepoMock.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: dto.email, roles: [role] }),
      );
      expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(
        { id: savedAdmin.id },
        {
          secret: 'confirm-secret',
          expiresIn: '1d',
        },
      );
      expect(cacheMock.set).toHaveBeenCalledWith(
        createCacheKey(CacheKey.EMAIL_VERIFICATION, savedAdmin.id),
        'verify-token',
        expect.any(Number),
      );
      expect(emailQueueMock.add).toHaveBeenCalledWith(
        JobName.ADMIN_EMAIL_VERIFICATION,
        {
          email: dto.email,
          token: 'verify-token',
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
      );
      expect(result).toEqual(expect.objectContaining({ email: dto.email }));
    });

    it('throws when the email already exists', async () => {
      adminRepoMock.findOne.mockResolvedValue(new AdminUserEntity());

      await expect(service.create(dto)).rejects.toMatchObject({
        response: { errorCode: ErrorCode.E001 },
      });
      expect(adminRepoMock.save).not.toHaveBeenCalled();
    });

    it('throws when any role id does not exist', async () => {
      adminRepoMock.findOne.mockResolvedValue(null);
      roleRepoMock.findBy.mockResolvedValue([]);

      await expect(service.create(dto)).rejects.toMatchObject({
        response: { errorCode: ErrorCode.E002 },
      });
      expect(adminRepoMock.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('replaces roles when role ids are provided', async () => {
      const existing = new AdminUserEntity({
        id: '1' as any,
        email: 'admin@example.com',
        password: 'secret1',
        roles: [],
      });
      const role = new RoleEntity({ id: '2' as any, name: 'Manager' });

      adminRepoMock.findOneOrFail.mockResolvedValue(existing);
      roleRepoMock.findBy.mockResolvedValue([role]);

      await service.update('1' as any, {
        firstName: 'Updated',
        lastName: 'Admin',
        email: 'admin@example.com',
        roleIds: ['2' as any],
      });

      expect(existing.roles).toEqual([role]);
      expect(
        (existing as AdminUserEntity & { password?: string }).password,
      ).toBe(undefined);
      expect(adminRepoMock.save).toHaveBeenCalledWith(existing);
    });

    it('throws when updated role ids cannot all be resolved', async () => {
      adminRepoMock.findOneOrFail.mockResolvedValue(
        new AdminUserEntity({ id: '1' as any, roles: [] }),
      );
      roleRepoMock.findBy.mockResolvedValue([]);

      await expect(
        service.update('1' as any, {
          firstName: 'Updated',
          lastName: 'Admin',
          email: 'admin@example.com',
          roleIds: ['missing' as any],
        }),
      ).rejects.toMatchObject({
        response: { errorCode: ErrorCode.E002 },
      });
      expect(adminRepoMock.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('soft removes the selected admin user', async () => {
      const admin = new AdminUserEntity({ id: '1' as any });
      adminRepoMock.findOneByOrFail.mockResolvedValue(admin);

      await service.remove('1' as any);

      expect(adminRepoMock.softRemove).toHaveBeenCalledWith(admin);
    });
  });
});
