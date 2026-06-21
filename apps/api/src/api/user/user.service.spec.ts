import { ErrorCode } from '@/constants/error-code.constant';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClsService } from 'nestjs-cls';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let userRepositoryValue: Partial<
    Record<keyof Repository<UserEntity>, jest.Mock>
  >;

  beforeAll(async () => {
    userRepositoryValue = {
      findOne: jest.fn(),
      findOneByOrFail: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: userRepositoryValue,
        },
        {
          provide: ClsService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
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
      const savedUser = new UserEntity({
        id: '1' as any,
        ...dto,
      });

      userRepositoryValue.findOne.mockResolvedValue(null);
      userRepositoryValue.save.mockResolvedValue(savedUser);

      const result = await service.create(dto);

      expect(userRepositoryValue.findOne).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(userRepositoryValue.save).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          password: dto.password,
        }),
      );
      expect(result).toEqual(expect.objectContaining({ email: dto.email }));
    });

    it('throws when the email is already used', async () => {
      userRepositoryValue.findOne.mockResolvedValue(new UserEntity());

      await expect(service.create(dto)).rejects.toMatchObject({
        response: { errorCode: ErrorCode.E001 },
      });
      expect(userRepositoryValue.save).not.toHaveBeenCalled();
    });

    it('throws when password confirmation does not match', async () => {
      userRepositoryValue.findOne.mockResolvedValue(null);

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
      const user = new UserEntity({
        id: '1' as any,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
      });

      userRepositoryValue.findOneByOrFail.mockResolvedValue(user);

      const result = await service.findOne('1' as any);

      expect(userRepositoryValue.findOneByOrFail).toHaveBeenCalledWith({
        id: '1',
      });
      expect(result).toEqual(expect.objectContaining({ email: user.email }));
    });
  });

  describe('update', () => {
    it('updates mutable profile fields only', async () => {
      const user = new UserEntity({
        id: '1' as any,
        firstName: 'Old',
        lastName: 'Name',
        email: 'jane@example.com',
      });

      userRepositoryValue.findOneByOrFail.mockResolvedValue(user);

      await service.update('1' as any, {
        firstName: 'New',
        lastName: 'Person',
        confirmPassword: 'secret1',
      });

      expect(user.firstName).toBe('New');
      expect(user.lastName).toBe('Person');
      expect(userRepositoryValue.save).toHaveBeenCalledWith(user);
    });
  });

  describe('remove', () => {
    it('soft removes the selected user', async () => {
      const user = new UserEntity({ id: '1' as any });

      userRepositoryValue.findOneByOrFail.mockResolvedValue(user);

      await service.remove('1' as any);

      expect(userRepositoryValue.softRemove).toHaveBeenCalledWith(user);
    });
  });
});
