import { UserService } from '@/api/user/user.service';
import { AutoIncrementID } from '@/common/types/common.type';
import { CaslAbilityFactory } from '@/libs/casl/ability.factory';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminUserController } from './admin-user.controller';
import { AdminUserResDto } from './dto/admin-user.res.dto';
import { CreateAdminUserReqDto } from './dto/create-admin-user.req.dto';

describe('AdminUserController', () => {
  let controller: AdminUserController;
  let service: UserService;
  let userServiceValue: Partial<Record<keyof UserService, jest.Mock>>;

  beforeAll(async () => {
    userServiceValue = {
      findOneAdmin: jest.fn(),
      createAdminUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUserController],
      providers: [
        {
          provide: UserService,
          useValue: userServiceValue,
        },
        CaslAbilityFactory,
      ],
    }).compile();

    controller = module.get<AdminUserController>(AdminUserController);
    service = module.get<UserService>(UserService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  // TODO: write unit tests for getCurrentUser method

  describe('createUser', () => {
    it('should return a user', async () => {
      const createAdminUserReqDto = {
        username: 'john',
        email: 'mail@example.com',
        password: 'password',
        bio: 'bio',
        avatar: 'image',
        firstName: 'John',
        lastName: 'Doe',
        roleIds: ['1' as AutoIncrementID],
      } as CreateAdminUserReqDto;

      const userResDto = new AdminUserResDto();
      userResDto.id = '1';
      userResDto.email = 'mail@example.com';
      userResDto.bio = 'bio';
      userResDto.avatar = 'image';
      userResDto.createdAt = new Date();
      userResDto.updatedAt = new Date();

      userServiceValue.createAdminUser.mockReturnValue(userResDto);
      const user = await controller.createUser(createAdminUserReqDto);

      expect(user).toBe(userResDto);
      expect(userServiceValue.createAdminUser).toHaveBeenCalledWith(
        createAdminUserReqDto,
      );
      expect(userServiceValue.createAdminUser).toHaveBeenCalledTimes(1);
    });

    it('should return null', async () => {
      userServiceValue.createAdminUser.mockReturnValue(null);
      const user = await controller.createUser({} as CreateAdminUserReqDto);

      expect(user).toBeNull();
      expect(userServiceValue.createAdminUser).toHaveBeenCalledWith({});
      expect(userServiceValue.createAdminUser).toHaveBeenCalledTimes(1);
    });

    describe('createAdminUserReqDto', () => {
      let createAdminUserReqDto: CreateAdminUserReqDto;

      beforeEach(() => {
        createAdminUserReqDto = plainToInstance(CreateAdminUserReqDto, {
          email: 'mail@example.com',
          password: 'password',
          avatar: 'image',
          firstName: 'John',
          lastName: 'Doe',
          bio: 'bio',
          roleIds: ['1' as AutoIncrementID],
        });
      });

      it('should success with correctly data', async () => {
        const errors = await validate(createAdminUserReqDto);
        expect(errors.length).toEqual(0);
      });

      it('should fail with empty email', async () => {
        createAdminUserReqDto.email = '';
        const errors = await validate(createAdminUserReqDto);
        expect(errors.length).toEqual(1);
        expect(errors[0].property).toBe('email');
      });

      it('should fail with invalid email', async () => {
        createAdminUserReqDto.email = 'invalid-email';
        const errors = await validate(createAdminUserReqDto);
        expect(errors.length).toEqual(1);
        expect(errors[0].constraints).toEqual({
          isEmail: 'email must be an email',
        });
      });

      it('should fail with empty password', async () => {
        createAdminUserReqDto.password = '';
        const errors = await validate(createAdminUserReqDto);
        expect(errors.length).toEqual(1);
        expect(errors[0].constraints).toEqual({
          minLength: 'password must be longer than or equal to 6 characters',
        });
      });

      it('should fail with invalid password', async () => {
        createAdminUserReqDto.password = 'invalid-password';
        const errors = await validate(createAdminUserReqDto);
        expect(errors.length).toEqual(1);
        expect(errors[0].constraints).toEqual({
          isPassword: 'password is invalid',
        });
      });
    });
  });

  // TODO: write unit tests for findAllUsers method
  // TODO: write unit tests for loadMoreUsers method

  describe('findUser', () => {
    it('should return a user', async () => {
      const adminUserResDto = new AdminUserResDto();
      adminUserResDto.id = '1';
      adminUserResDto.email = 'mail@example.com';
      adminUserResDto.bio = 'bio';
      adminUserResDto.avatar = 'image';
      adminUserResDto.createdAt = new Date();
      adminUserResDto.updatedAt = new Date();

      userServiceValue.findOneAdmin.mockReturnValue(adminUserResDto);
      const user = await controller.findUser('1' as AutoIncrementID);

      expect(user).toBe(adminUserResDto);
      expect(userServiceValue.findOneAdmin).toHaveBeenCalledWith('1');
      expect(userServiceValue.findOneAdmin).toHaveBeenCalledTimes(1);
    });

    it('should return null', async () => {
      userServiceValue.findOneAdmin.mockReturnValue(null);
      const user = await controller.findUser('1' as AutoIncrementID);

      expect(user).toBeNull();
      expect(userServiceValue.findOneAdmin).toHaveBeenCalledWith('1');
      expect(userServiceValue.findOneAdmin).toHaveBeenCalledTimes(1);
    });
  });

  // TODO: write unit tests for updateUser method
  // TODO: write unit tests for removeUser method
  // TODO: write unit tests for changePassword method
});
