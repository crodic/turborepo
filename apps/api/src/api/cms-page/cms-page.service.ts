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
import { CmsPageTranslationEntity } from './entities/cms-page-translation.entity';
import { CmsPageEntity, ECmsPageStatus } from './entities/cms-page.entity';

@Injectable()
export class CmsPageService {
  constructor(
    @InjectRepository(CmsPageEntity)
    private readonly cmsPageRepository: Repository<CmsPageEntity>,
    @InjectRepository(CmsPageTranslationEntity)
    private readonly translationRepository: Repository<CmsPageTranslationEntity>,
  ) {}

  async findAll(query: PaginateQuery): Promise<Paginated<CmsPageResDto>> {
    const queryBuilder = this.cmsPageRepository.createQueryBuilder('cmsPage');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'status', 'createdAt', 'updatedAt'],
      searchableColumns: [
        'translations.title',
        'translations.slug',
        'translations.seoTitle',
        'translations.seoDescription',
      ],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        status: [FilterOperator.EQ],
      },
      relations: ['translations'],
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

  async findPublishedBySlug(
    slug: string,
    locale: string,
  ): Promise<CmsPageResDto> {
    const page = await this.cmsPageRepository.findOne({
      where: {
        status: ECmsPageStatus.PUBLISHED,
        deletedAt: IsNull(),
        translations: {
          slug: normalizeSlug(slug),
          locale,
        },
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
    const translations = dto.translations || [];

    for (const t of translations) {
      t.slug = normalizeSlug(t.slug || t.title);
      await this.assertSlugAvailable(t.slug);
    }

    const page = this.cmsPageRepository.create({
      status,
      createdBy: adminId,
      updatedBy: adminId,
      publishedAt: status === ECmsPageStatus.PUBLISHED ? new Date() : undefined,
      translations,
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

    const nextStatus = dto.status ?? page.status;
    const shouldSetPublishedAt =
      nextStatus === ECmsPageStatus.PUBLISHED && !page.publishedAt;

    Object.assign(page, {
      status: nextStatus,
      updatedBy: adminId,
      publishedAt: shouldSetPublishedAt ? new Date() : page.publishedAt,
    });

    if (nextStatus === ECmsPageStatus.DRAFT) {
      page.publishedAt = null;
    }

    if (dto.translations) {
      // Check slugs
      for (const t of dto.translations) {
        t.slug = normalizeSlug(t.slug || t.title);
        await this.assertSlugAvailable(t.slug, id);
      }

      // We overwrite translations for simplicity (delete old, insert new)
      await this.translationRepository.delete({ pageId: id });
      page.translations = dto.translations.map((t) =>
        this.translationRepository.create({ ...t }),
      );
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
    const where = currentId ? { slug, pageId: Not(currentId) } : { slug };
    const exists = await this.translationRepository.exists({ where });

    if (exists) {
      throw new BadRequestException(`A page with slug ${slug} already exists`);
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
