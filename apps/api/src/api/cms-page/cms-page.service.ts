import { AutoIncrementID } from '@/common/types/common.type';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { IsNull, Not, Repository } from 'typeorm';
import { CmsPageResDto } from './dto/cms-page.res.dto';
import { CreateCmsPageReqDto } from './dto/create-cms-page.req.dto';
import { UpdateCmsPageReqDto } from './dto/update-cms-page.req.dto';
import { CmsPageEntity, ECmsPageStatus } from './entities/cms-page.entity';

@Injectable()
export class CmsPageService {
  constructor(
    @InjectRepository(CmsPageEntity)
    private readonly cmsPageRepository: Repository<CmsPageEntity>,
  ) {}

  async findAll(query: PaginateQuery): Promise<Paginated<CmsPageResDto>> {
    const queryBuilder = this.cmsPageRepository.createQueryBuilder('cmsPage');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: [
        'id',
        'title',
        'slug',
        'status',
        'createdAt',
        'updatedAt',
      ],
      searchableColumns: ['title', 'slug', 'seoTitle', 'seoDescription'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        title: [FilterOperator.ILIKE],
        slug: [FilterOperator.ILIKE],
        status: [FilterOperator.EQ],
      },
    });

    return {
      ...result,
      data: this.toDtos(result.data),
    } as Paginated<CmsPageResDto>;
  }

  async findOne(id: AutoIncrementID): Promise<CmsPageResDto> {
    const page = await this.cmsPageRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    return this.toDto(page);
  }

  async findPublishedBySlug(slug: string): Promise<CmsPageResDto> {
    const page = await this.cmsPageRepository.findOne({
      where: {
        slug: normalizeSlug(slug),
        status: ECmsPageStatus.PUBLISHED,
        deletedAt: IsNull(),
      },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    return this.toDto(page);
  }

  async create(
    dto: CreateCmsPageReqDto,
    adminId: AutoIncrementID,
  ): Promise<CmsPageResDto> {
    const status = dto.status ?? ECmsPageStatus.DRAFT;
    const slug = normalizeSlug(dto.slug || dto.title);

    await this.assertSlugAvailable(slug);

    const page = this.cmsPageRepository.create({
      ...dto,
      slug,
      status,
      variables: dto.variables ?? [],
      createdBy: adminId,
      updatedBy: adminId,
      publishedAt: status === ECmsPageStatus.PUBLISHED ? new Date() : undefined,
    });

    return this.toDto(await this.cmsPageRepository.save(page));
  }

  async update(
    id: AutoIncrementID,
    dto: UpdateCmsPageReqDto,
    adminId: AutoIncrementID,
  ): Promise<CmsPageResDto> {
    const page = await this.cmsPageRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const nextSlug = dto.slug ? normalizeSlug(dto.slug) : page.slug;
    await this.assertSlugAvailable(nextSlug, id);

    const nextStatus = dto.status ?? page.status;
    const shouldSetPublishedAt =
      nextStatus === ECmsPageStatus.PUBLISHED && !page.publishedAt;

    Object.assign(page, {
      ...dto,
      slug: nextSlug,
      status: nextStatus,
      variables: dto.variables ?? page.variables,
      updatedBy: adminId,
      publishedAt: shouldSetPublishedAt ? new Date() : page.publishedAt,
    });

    if (nextStatus === ECmsPageStatus.DRAFT) {
      page.publishedAt = null;
    }

    return this.toDto(await this.cmsPageRepository.save(page));
  }

  async remove(id: AutoIncrementID): Promise<{ message: string }> {
    const result = await this.cmsPageRepository.softDelete({
      id,
      deletedAt: IsNull(),
    });

    if (result.affected === 0) {
      throw new NotFoundException('Page not found');
    }

    return { message: 'Page deleted successfully' };
  }

  private async assertSlugAvailable(slug: string, currentId?: AutoIncrementID) {
    const where = currentId
      ? { slug, id: Not(currentId), deletedAt: IsNull() }
      : { slug, deletedAt: IsNull() };
    const exists = await this.cmsPageRepository.exists({ where });

    if (exists) {
      throw new BadRequestException('A page with this slug already exists');
    }
  }

  private toDto(page: CmsPageEntity) {
    return plainToInstance(CmsPageResDto, page, {
      excludeExtraneousValues: true,
    });
  }

  private toDtos(pages: CmsPageEntity[]) {
    return plainToInstance(CmsPageResDto, pages, {
      excludeExtraneousValues: true,
    });
  }
}

function normalizeSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9/_ -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/-+/g, '-');

  return slug || 'untitled';
}
