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
import { CreateCityReqDto, UpdateCityReqDto } from '../dto/city.req.dto';
import { CityResDto } from '../dto/city.res.dto';
import { CityEntity } from '../entities/city.entity';

@Injectable()
export class CityService {
  constructor(
    @InjectRepository(CityEntity)
    private readonly cityRepository: Repository<CityEntity>,
  ) {}

  async findAll(query: PaginateQuery): Promise<Paginated<CityResDto>> {
    const queryBuilder = this.cityRepository
      .createQueryBuilder('city')
      .leftJoinAndSelect('city.state', 'state')
      .leftJoinAndSelect('city.country', 'country');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: [
        'id',
        'name',
        'stateId',
        'stateCode',
        'countryId',
        'countryCode',
        'code',
        'createdAt',
        'updatedAt',
      ],
      searchableColumns: ['name', 'stateCode', 'countryCode', 'code'],
      defaultSortBy: [['name', 'ASC']],
      filterableColumns: {
        stateId: [FilterOperator.EQ, FilterOperator.IN],
        countryId: [FilterOperator.EQ, FilterOperator.IN],
        countryCode: [
          FilterOperator.EQ,
          FilterOperator.ILIKE,
          FilterOperator.IN,
        ],
        stateCode: [FilterOperator.EQ, FilterOperator.ILIKE, FilterOperator.IN],
        code: [FilterOperator.EQ, FilterOperator.ILIKE],
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    });

    return {
      ...result,
      data: this.toDtos(result.data),
    } as Paginated<CityResDto>;
  }

  async listByState(stateId: AutoIncrementID): Promise<CityResDto[]> {
    const cities = await this.cityRepository.find({
      where: { stateId },
      order: { name: 'ASC' },
      relations: ['state', 'country'],
    });
    return this.toDtos(cities);
  }

  async listByCountry(countryId: AutoIncrementID): Promise<CityResDto[]> {
    const cities = await this.cityRepository.find({
      where: { countryId },
      order: { name: 'ASC' },
      relations: ['state', 'country'],
      take: 200,
    });
    return this.toDtos(cities);
  }

  async findOne(id: AutoIncrementID): Promise<CityResDto> {
    const city = await this.cityRepository.findOne({
      where: { id },
      relations: ['state', 'country'],
    });

    if (!city) {
      throw new NotFoundException('City not found');
    }

    return this.toDto(city);
  }

  async create(dto: CreateCityReqDto): Promise<CityResDto> {
    const city = this.cityRepository.create({
      ...dto,
      stateId: dto.stateId ? (dto.stateId as AutoIncrementID) : null,
      countryId: dto.countryId ? (dto.countryId as AutoIncrementID) : null,
    });
    const saved = await this.cityRepository.save(city);
    return this.findOne(saved.id);
  }

  async update(
    id: AutoIncrementID,
    dto: UpdateCityReqDto,
  ): Promise<CityResDto> {
    const city = await this.cityRepository.findOne({ where: { id } });

    if (!city) {
      throw new NotFoundException('City not found');
    }

    Object.assign(city, {
      ...dto,
      stateId:
        dto.stateId !== undefined
          ? dto.stateId
            ? (dto.stateId as AutoIncrementID)
            : null
          : city.stateId,
      countryId:
        dto.countryId !== undefined
          ? dto.countryId
            ? (dto.countryId as AutoIncrementID)
            : null
          : city.countryId,
    });

    await this.cityRepository.save(city);
    return this.findOne(id);
  }

  async remove(id: AutoIncrementID): Promise<{ message: string }> {
    const result = await this.cityRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('City not found');
    }

    return { message: 'City deleted successfully' };
  }

  private toDto(city: CityEntity): CityResDto {
    return plainToInstance(CityResDto, city, {
      excludeExtraneousValues: true,
    });
  }

  private toDtos(cities: CityEntity[]): CityResDto[] {
    return plainToInstance(CityResDto, cities, {
      excludeExtraneousValues: true,
    });
  }
}
