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
import { CreateRegionReqDto, UpdateRegionReqDto } from '../dto/region.req.dto';
import { RegionResDto } from '../dto/region.res.dto';
import { RegionEntity } from '../entities/region.entity';

@Injectable()
export class RegionService {
  constructor(
    @InjectRepository(RegionEntity)
    private readonly regionRepository: Repository<RegionEntity>,
  ) {}

  async findAll(query: PaginateQuery): Promise<Paginated<RegionResDto>> {
    const queryBuilder = this.regionRepository.createQueryBuilder('region');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'name', 'createdAt', 'updatedAt'],
      searchableColumns: ['name'],
      defaultSortBy: [['name', 'ASC']],
      filterableColumns: {
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    });

    return {
      ...result,
      data: this.toDtos(result.data),
    } as Paginated<RegionResDto>;
  }

  async listAll(): Promise<RegionResDto[]> {
    const regions = await this.regionRepository.find({
      order: { name: 'ASC' },
    });
    return this.toDtos(regions);
  }

  async findOne(id: AutoIncrementID): Promise<RegionResDto> {
    const region = await this.regionRepository.findOne({
      where: { id },
      relations: ['countries'],
    });

    if (!region) {
      throw new NotFoundException('Region not found');
    }

    return this.toDto(region);
  }

  async create(dto: CreateRegionReqDto): Promise<RegionResDto> {
    const region = this.regionRepository.create(dto);
    return this.toDto(await this.regionRepository.save(region));
  }

  async update(
    id: AutoIncrementID,
    dto: UpdateRegionReqDto,
  ): Promise<RegionResDto> {
    const region = await this.regionRepository.findOne({ where: { id } });

    if (!region) {
      throw new NotFoundException('Region not found');
    }

    Object.assign(region, dto);
    return this.toDto(await this.regionRepository.save(region));
  }

  async remove(id: AutoIncrementID): Promise<{ message: string }> {
    const result = await this.regionRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('Region not found');
    }

    return { message: 'Region deleted successfully' };
  }

  private toDto(region: RegionEntity): RegionResDto {
    return plainToInstance(RegionResDto, region, {
      excludeExtraneousValues: true,
    });
  }

  private toDtos(regions: RegionEntity[]): RegionResDto[] {
    return plainToInstance(RegionResDto, regions, {
      excludeExtraneousValues: true,
    });
  }
}
