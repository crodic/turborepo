import { AutoIncrementID } from '@/common/types/common.type';
import { CaslAbilityFactory } from '@/libs/casl/ability.factory';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserReqDto } from './dto/create-user.req.dto';
import { UserResDto } from './dto/user.res.dto';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;
  let userServiceValue: Partial<Record<keyof UserService, jest.Mock>>;

  beforeAll(async () => {
    userServiceValue = {
      findOne: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: userServiceValue,
        },
        CaslAbilityFactory,
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
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
      const createUserReqDto = {
        id: '1' as AutoIncrementID,
        username: 'john',
        email: 'mail@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
        confirmPassword: 'password',
      } as CreateUserReqDto;

      const userResDto = new UserResDto();
      userResDto.id = '1' as AutoIncrementID;
      userResDto.email = 'mail@example.com';
      userResDto.avatar = 'image';
      userResDto.createdAt = new Date();
      userResDto.updatedAt = new Date();

      userServiceValue.create.mockReturnValue(userResDto);
      const user = await controller.createUser(createUserReqDto);

      expect(user).toBe(userResDto);
      expect(userServiceValue.create).toHaveBeenCalledWith(createUserReqDto);
      expect(userServiceValue.create).toHaveBeenCalledTimes(1);
    });

    it('should return null', async () => {
      userServiceValue.create.mockReturnValue(null);
      const user = await controller.createUser({} as CreateUserReqDto);

      expect(user).toBeNull();
      expect(userServiceValue.create).toHaveBeenCalledWith({});
      expect(userServiceValue.create).toHaveBeenCalledTimes(1);
    });

    describe('CreateUserReqDto', () => {
      let createUserReqDto: CreateUserReqDto;

      beforeEach(() => {
        createUserReqDto = plainToInstance(CreateUserReqDto, {
          email: 'mail@example.com',
          password: 'password',
          confirmPassword: 'password',
          avatar: 'image',
          firstName: 'John',
          lastName: 'Doe',
        });
      });

      it('should success with correctly data', async () => {
        const errors = await validate(createUserReqDto);
        expect(errors.length).toEqual(0);
      });

      it('should fail with empty email', async () => {
        createUserReqDto.email = '';
        const errors = await validate(createUserReqDto);
        expect(errors.length).toEqual(1);
        expect(errors[0].property).toBe('email');
      });

      it('should fail with invalid email', async () => {
        createUserReqDto.email = 'invalid-email';
        const errors = await validate(createUserReqDto);
        expect(errors.length).toEqual(1);
        expect(errors[0].constraints).toEqual({
          isEmail: 'email must be an email',
        });
      });

      it('should fail with empty password', async () => {
        createUserReqDto.password = '';
        const errors = await validate(createUserReqDto);
        expect(errors.length).toEqual(1);
        expect(errors[0].constraints).toEqual({
          minLength: 'password must be longer than or equal to 6 characters',
        });
      });

      it('should fail with invalid password', async () => {
        createUserReqDto.password = 'invalid-password';
        const errors = await validate(createUserReqDto);
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
      const userResDto = new UserResDto();
      userResDto.id = '1' as AutoIncrementID;
      userResDto.email = 'mail@example.com';
      userResDto.avatar = 'image';
      userResDto.createdAt = new Date();
      userResDto.updatedAt = new Date();

      userServiceValue.findOne.mockReturnValue(userResDto);
      const user = await controller.findUser('1' as AutoIncrementID);

      expect(user).toBe(userResDto);
      expect(userServiceValue.findOne).toHaveBeenCalledWith('1');
      expect(userServiceValue.findOne).toHaveBeenCalledTimes(1);
    });

    it('should return null', async () => {
      userServiceValue.findOne.mockReturnValue(null);
      const user = await controller.findUser('1' as AutoIncrementID);

      expect(user).toBeNull();
      expect(userServiceValue.findOne).toHaveBeenCalledWith('1');
      expect(userServiceValue.findOne).toHaveBeenCalledTimes(1);
    });
  });

  // TODO: write unit tests for updateUser method
  // TODO: write unit tests for removeUser method
  // TODO: write unit tests for changePassword method
});
