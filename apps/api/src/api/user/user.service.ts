import { AutoIncrementID } from '@/common/types/common.type';
import { ErrorCode } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import assert from 'assert';
import { plainToInstance } from 'class-transformer';
import { ClsService } from 'nestjs-cls';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { CreateUserReqDto } from './dto/create-user.req.dto';
import { UpdateUserReqDto } from './dto/update-user.req.dto';
import { UserResDto } from './dto/user.res.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private cls: ClsService,
  ) {}

  async findAllUser(query: PaginateQuery): Promise<Paginated<UserResDto>> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'email', 'createdAt', 'updatedAt'],
      searchableColumns: ['email', 'id'],
      defaultSortBy: [['id', 'DESC']],
      relations: [],
      filterableColumns: {
        createdAt: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.BTW],
        fullName: [FilterOperator.ILIKE],
        email: [FilterOperator.ILIKE],
        id: [FilterOperator.EQ],
      },
    });

    return {
      ...result,
      data: plainToInstance(UserResDto, result.data, {
        excludeExtraneousValues: true,
      }),
    } as Paginated<UserResDto>;
  }

  async create(dto: CreateUserReqDto): Promise<UserResDto> {
    const { email, password } = dto;

    const user = await this.userRepository.findOne({
      where: {
        email,
      },
    });

    if (user) {
      throw new ValidationException(ErrorCode.E001);
    }

    if (dto.password !== dto.confirmPassword) {
      throw new ValidationException(ErrorCode.E003);
    }

    const newUser = new UserEntity({
      ...dto,
      email,
      password,
    });

    const savedUser = await this.userRepository.save(newUser);

    return plainToInstance(UserResDto, savedUser);
  }

  async findOne(id: AutoIncrementID): Promise<UserResDto> {
    assert(id, 'id is required');
    const user = await this.userRepository.findOneByOrFail({ id });

    return user.toDto(UserResDto);
  }

  async update(id: AutoIncrementID, updateUserDto: UpdateUserReqDto) {
    const user = await this.userRepository.findOneByOrFail({ id });

    user.firstName = updateUserDto.firstName;
    user.lastName = updateUserDto.lastName;

    await this.userRepository.save(user);
  }

  async remove(id: AutoIncrementID) {
    const user = await this.userRepository.findOneByOrFail({ id });
    await this.userRepository.softRemove(user);
  }
}
