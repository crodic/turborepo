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
import {
  CreateCountryReqDto,
  UpdateCountryReqDto,
} from '../dto/country.req.dto';
import { CountryResDto } from '../dto/country.res.dto';
import { StateResDto } from '../dto/state.res.dto';
import { CountryEntity } from '../entities/country.entity';
import { StateEntity } from '../entities/state.entity';

@Injectable()
export class CountryService {
  constructor(
    @InjectRepository(CountryEntity)
    private readonly countryRepository: Repository<CountryEntity>,
    @InjectRepository(StateEntity)
    private readonly stateRepository: Repository<StateEntity>,
  ) {}

  async findAll(query: PaginateQuery): Promise<Paginated<CountryResDto>> {
    const queryBuilder = this.countryRepository
      .createQueryBuilder('country')
      .leftJoinAndSelect('country.region', 'region');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: [
        'id',
        'name',
        'iso2',
        'iso3',
        'capital',
        'phonecode',
        'currency',
        'createdAt',
        'updatedAt',
      ],
      searchableColumns: ['name', 'iso2', 'iso3', 'capital', 'currency'],
      defaultSortBy: [['name', 'ASC']],
      filterableColumns: {
        regionId: [FilterOperator.EQ, FilterOperator.IN],
        iso2: [FilterOperator.EQ, FilterOperator.ILIKE, FilterOperator.IN],
        iso3: [FilterOperator.EQ, FilterOperator.ILIKE, FilterOperator.IN],
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    });

    return {
      ...result,
      data: this.toDtos(result.data),
    } as Paginated<CountryResDto>;
  }

  async listAll(regionId?: AutoIncrementID): Promise<CountryResDto[]> {
    const queryBuilder = this.countryRepository
      .createQueryBuilder('country')
      .leftJoinAndSelect('country.region', 'region')
      .orderBy('country.name', 'ASC');

    if (regionId) {
      queryBuilder.where('country.region_id = :regionId', { regionId });
    }

    const countries = await queryBuilder.getMany();
    return this.toDtos(countries);
  }

  async findOne(id: AutoIncrementID): Promise<CountryResDto> {
    const country = await this.countryRepository.findOne({
      where: { id },
      relations: ['region'],
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return this.toDto(country);
  }

  async findStatesByCountry(
    countryId: AutoIncrementID,
  ): Promise<StateResDto[]> {
    const states = await this.stateRepository.find({
      where: { countryId },
      order: { name: 'ASC' },
    });

    return plainToInstance(StateResDto, states, {
      excludeExtraneousValues: true,
    });
  }

  async create(dto: CreateCountryReqDto): Promise<CountryResDto> {
    const country = this.countryRepository.create({
      ...dto,
      regionId: dto.regionId ? (dto.regionId as AutoIncrementID) : null,
    });
    const saved = await this.countryRepository.save(country);
    return this.findOne(saved.id);
  }

  async update(
    id: AutoIncrementID,
    dto: UpdateCountryReqDto,
  ): Promise<CountryResDto> {
    const country = await this.countryRepository.findOne({ where: { id } });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    Object.assign(country, {
      ...dto,
      regionId:
        dto.regionId !== undefined
          ? dto.regionId
            ? (dto.regionId as AutoIncrementID)
            : null
          : country.regionId,
    });

    await this.countryRepository.save(country);
    return this.findOne(id);
  }

  async remove(id: AutoIncrementID): Promise<{ message: string }> {
    const result = await this.countryRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('Country not found');
    }

    return { message: 'Country deleted successfully' };
  }

  private toDto(country: CountryEntity): CountryResDto {
    return plainToInstance(CountryResDto, country, {
      excludeExtraneousValues: true,
    });
  }

  private toDtos(countries: CountryEntity[]): CountryResDto[] {
    return plainToInstance(CountryResDto, countries, {
      excludeExtraneousValues: true,
    });
  }
}
