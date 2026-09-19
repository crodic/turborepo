import { AutoIncrementID } from '@/common/types/common.type';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { CityResDto } from '../dto/city.res.dto';
import { CreateStateReqDto, UpdateStateReqDto } from '../dto/state.req.dto';
import { StateResDto } from '../dto/state.res.dto';
import { CityEntity } from '../entities/city.entity';
import { StateEntity } from '../entities/state.entity';

@Injectable()
export class StateService {
  constructor(
    @InjectRepository(StateEntity)
    private readonly stateRepository: Repository<StateEntity>,
    @InjectRepository(CityEntity)
    private readonly cityRepository: Repository<CityEntity>,
  ) {}

  async findAll(query: PaginateQuery): Promise<Paginated<StateResDto>> {
    const queryBuilder = this.stateRepository
      .createQueryBuilder('state')
      .leftJoinAndSelect('state.country', 'country');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: [
        'id',
        'name',
        'countryId',
        'countryCode',
        'type',
        'iso2',
        'createdAt',
        'updatedAt',
      ],
      searchableColumns: ['name', 'countryCode', 'iso2'],
      defaultSortBy: [['name', 'ASC']],
      filterableColumns: {
        countryId: [FilterOperator.EQ, FilterOperator.IN],
        countryCode: [
          FilterOperator.EQ,
          FilterOperator.ILIKE,
          FilterOperator.IN,
        ],
        iso2: [FilterOperator.EQ, FilterOperator.ILIKE, FilterOperator.IN],
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    });

    return {
      ...result,
      data: this.toDtos(result.data),
    } as Paginated<StateResDto>;
  }

  async listByCountry(countryId: AutoIncrementID): Promise<StateResDto[]> {
    const states = await this.stateRepository.find({
      where: { countryId },
      order: { name: 'ASC' },
      relations: ['country'],
    });
    return this.toDtos(states);
  }

  async findOne(id: AutoIncrementID): Promise<StateResDto> {
    const state = await this.stateRepository.findOne({
      where: { id },
      relations: ['country'],
    });

    if (!state) {
      throw new NotFoundException('State not found');
    }

    return this.toDto(state);
  }

  async findCitiesByState(stateId: AutoIncrementID): Promise<CityResDto[]> {
    const cities = await this.cityRepository.find({
      where: { stateId },
      order: { name: 'ASC' },
    });

    return plainToInstance(CityResDto, cities, {
      excludeExtraneousValues: true,
    });
  }

  async create(dto: CreateStateReqDto): Promise<StateResDto> {
    const state = this.stateRepository.create({
      ...dto,
      countryId: dto.countryId as AutoIncrementID,
    });
    const saved = await this.stateRepository.save(state);
    return this.findOne(saved.id);
  }

  async update(
    id: AutoIncrementID,
    dto: UpdateStateReqDto,
  ): Promise<StateResDto> {
    const state = await this.stateRepository.findOne({ where: { id } });

    if (!state) {
      throw new NotFoundException('State not found');
    }

    Object.assign(state, {
      ...dto,
      countryId: dto.countryId
        ? (dto.countryId as AutoIncrementID)
        : state.countryId,
    });

    await this.stateRepository.save(state);
    return this.findOne(id);
  }

  async remove(id: AutoIncrementID): Promise<{ message: string }> {
    const result = await this.stateRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('State not found');
    }

    return { message: 'State deleted successfully' };
  }

  private toDto(state: StateEntity): StateResDto {
    return plainToInstance(StateResDto, state, {
      excludeExtraneousValues: true,
    });
  }

  private toDtos(states: StateEntity[]): StateResDto[] {
    return plainToInstance(StateResDto, states, {
      excludeExtraneousValues: true,
    });
  }
}
