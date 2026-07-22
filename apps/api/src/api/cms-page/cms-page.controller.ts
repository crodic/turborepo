import { AutoIncrementID } from '@/common/types/common.type';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { CheckPolicies } from '@/decorators/policies.decorator';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { AppAbility } from '@/libs/casl/ability.factory';
import { AppActions, AppSubjects } from '@/utils/permissions.constant';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import {
  FilterOperator,
  Paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { CmsPageService } from './cms-page.service';
import { CmsPageResDto } from './dto/cms-page.res.dto';
import { CreateCmsPageReqDto } from './dto/create-cms-page.req.dto';
import { UpdateCmsPageReqDto } from './dto/update-cms-page.req.dto';

@ApiTags('CMS Pages')
@Controller({ path: 'cms-pages', version: '1' })
@UseGuards(AdminAuthGuard, PoliciesGuard)
export class CmsPageAdminController {
  constructor(private readonly cmsPageService: CmsPageService) {}

  @Get()
  @ApiAuth({
    type: CmsPageResDto,
    summary: 'Get paginated list of CMS pages',
    isPaginated: true,
    paginateOptions: {
      sortableColumns: [
        'id',
        'title',
        'slug',
        'status',
        'createdAt',
        'updatedAt',
      ],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        title: [FilterOperator.ILIKE],
        slug: [FilterOperator.ILIKE],
        locale: [FilterOperator.EQ],
        status: [FilterOperator.EQ],
      },
    },
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Page),
  )
  findAll(@Paginate() query: PaginateQuery): Promise<Paginated<CmsPageResDto>> {
    return this.cmsPageService.findAll(query);
  }

  @Post()
  @ApiAuth({ type: CmsPageResDto, summary: 'Create CMS page' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.Page),
  )
  create(
    @Body() dto: CreateCmsPageReqDto,
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<CmsPageResDto> {
    return this.cmsPageService.create(dto, adminId);
  }

  @Get(':id')
  @ApiAuth({ type: CmsPageResDto, summary: 'Find CMS page by id' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Page),
  )
  findOne(@Param('id') id: AutoIncrementID): Promise<CmsPageResDto> {
    return this.cmsPageService.findOne(id);
  }

  @Put(':id')
  @ApiAuth({ type: CmsPageResDto, summary: 'Update CMS page' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.Page),
  )
  update(
    @Param('id') id: AutoIncrementID,
    @Body() dto: UpdateCmsPageReqDto,
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<CmsPageResDto> {
    return this.cmsPageService.update(id, dto, adminId);
  }

  @Delete(':id')
  @ApiAuth({ summary: 'Delete CMS page' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Delete, AppSubjects.Page),
  )
  remove(@Param('id') id: AutoIncrementID): Promise<{ message: string }> {
    return this.cmsPageService.remove(id);
  }
}

@ApiTags('Public CMS Pages')
@Controller({ path: 'public/cms-pages', version: '1' })
export class CmsPagePublicController {
  constructor(private readonly cmsPageService: CmsPageService) {}

  @Get('by-slug/*slug')
  @ApiPublic({
    type: CmsPageResDto,
    summary: 'Find published CMS page by slug and locale',
  })
  @ApiParam({ name: 'slug', type: 'String' })
  findBySlug(
    @Param('slug') slug: string | string[],
    @Query('locale') locale: string,
  ): Promise<CmsPageResDto> {
    return this.cmsPageService.findPublishedBySlug(
      Array.isArray(slug) ? slug.join('/') : slug,
      locale,
    );
  }
}
