import { RoleEntity } from '@/api/role/entities/role.entity';
import { RoleService } from '@/api/role/role.service';
import { EmailQueueService } from '@/background/queues/email-queue/email-queue.service';
import { DomainType } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { FilesystemService } from '@/filesystem/filesystem.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountEntity } from './entities/account.entity';
import { AdminProfileEntity } from './entities/admin-profile.entity';
import { UserProfileEntity } from './entities/user-profile.entity';
import { UserEntity } from './entities/user.entity';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let userRepositoryValue: Partial<
    Record<keyof Repository<UserEntity>, jest.Mock>
  >;
  let adminProfileRepoValue: Partial<
    Record<keyof Repository<AdminProfileEntity>, jest.Mock>
  >;
  let userProfileRepoValue: Partial<
    Record<keyof Repository<UserProfileEntity>, jest.Mock>
  >;
  let accountRepoValue: Partial<
    Record<keyof Repository<AccountEntity>, jest.Mock>
  >;
  let roleServiceMock: Partial<Record<keyof RoleService, jest.Mock>>;
  let filesystemServiceMock: Partial<
    Record<keyof FilesystemService, jest.Mock>
  >;

  beforeAll(async () => {
    userRepositoryValue = {
      create: jest.fn((data) => Object.assign(new UserEntity(), data)),
      exists: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    adminProfileRepoValue = {
      create: jest.fn((data) => Object.assign(new AdminProfileEntity(), data)),
      save: jest.fn(),
    };
    userProfileRepoValue = {
      create: jest.fn((data) => Object.assign(new UserProfileEntity(), data)),
      save: jest.fn(),
    };
    accountRepoValue = {
      create: jest.fn((data) => Object.assign(new AccountEntity(), data)),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    roleServiceMock = {
      findByNames: jest.fn().mockResolvedValue([]),
      findClientDefaultRole: jest.fn().mockResolvedValue(null),
    };
    filesystemServiceMock = {
      disk: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: userRepositoryValue,
        },
        {
          provide: getRepositoryToken(AdminProfileEntity),
          useValue: adminProfileRepoValue,
        },
        {
          provide: getRepositoryToken(UserProfileEntity),
          useValue: userProfileRepoValue,
        },
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: accountRepoValue,
        },
        {
          provide: getRepositoryToken(RoleEntity),
          useValue: {
            findBy: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: RoleService,
          useValue: roleServiceMock,
        },
        {
          provide: FilesystemService,
          useValue: filesystemServiceMock,
        },
        {
          provide: EmailQueueService,
          useValue: {
            sendAdminEmailVerification: jest.fn(),
            sendAdminAccountHardDeleted: jest.fn(),
            sendAdminAccountHardDeletedReport: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('test-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('15m'),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'secret1',
      confirmPassword: 'secret1',
    };

    it('creates a user when email is unique and passwords match', async () => {
      const savedUser = Object.assign(new UserEntity(), {
        id: '1' as any,
        ...dto,
        domain: DomainType.CLIENT,
      });

      userRepositoryValue.exists!.mockResolvedValue(false);
      userRepositoryValue.save!.mockResolvedValue(savedUser);

      const result = await service.create(dto);

      expect(userRepositoryValue.exists).toHaveBeenCalledWith({
        where: { email: dto.email, domain: DomainType.CLIENT },
      });
      expect(userRepositoryValue.save).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          password: expect.any(String),
        }),
      );
      expect(result).toEqual(expect.objectContaining({ email: dto.email }));
    });

    it('throws when the email is already used', async () => {
      userRepositoryValue.exists!.mockResolvedValue(true);

      await expect(service.create(dto)).rejects.toMatchObject({
        response: { errorCode: ErrorCode.E003 },
      });
      expect(userRepositoryValue.save).not.toHaveBeenCalled();
    });

    it('throws when password confirmation does not match', async () => {
      userRepositoryValue.exists!.mockResolvedValue(false);

      await expect(
        service.create({ ...dto, confirmPassword: 'different1' }),
      ).rejects.toMatchObject({
        response: { errorCode: ErrorCode.E003 },
      });
      expect(userRepositoryValue.save).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the user dto', async () => {
      const user = Object.assign(new UserEntity(), {
        id: '1' as any,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        domain: DomainType.CLIENT,
      });

      userRepositoryValue.findOneOrFail!.mockResolvedValue(user);

      const result = await service.findOne('1' as any);

      expect(userRepositoryValue.findOneOrFail).toHaveBeenCalledWith({
        where: { id: '1', domain: DomainType.CLIENT },
        relations: ['userProfile', 'accounts'],
      });
      expect(result).toEqual(expect.objectContaining({ email: user.email }));
    });
  });

  describe('update', () => {
    it('updates mutable profile fields only', async () => {
      const user = Object.assign(new UserEntity(), {
        id: '1' as any,
        firstName: 'Old',
        lastName: 'Name',
        email: 'jane@example.com',
        domain: DomainType.CLIENT,
      });

      userRepositoryValue.findOneOrFail!.mockResolvedValue(user);

      await service.update('1' as any, {
        firstName: 'New',
        lastName: 'Person',
      });

      expect(user.firstName).toBe('New');
      expect(user.lastName).toBe('Person');
      expect(userRepositoryValue.save).toHaveBeenCalledWith(user);
    });
  });

  describe('remove', () => {
    it('soft removes the selected user', async () => {
      const user = Object.assign(new UserEntity(), {
        id: '1' as any,
        domain: DomainType.CLIENT,
      });

      userRepositoryValue.findOneOrFail!.mockResolvedValue(user);

      await service.remove('1' as any);

      expect(userRepositoryValue.softRemove).toHaveBeenCalledWith(user);
    });
  });
});
