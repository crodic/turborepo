import { AutoIncrementID } from '@/common/types/common.type';
import { EThemeTarget } from '@/constants/entity.enum';
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
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
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
import { CreateThemeReqDto } from './dto/create-theme.req.dto';
import { PublishThemeReqDto } from './dto/publish-theme.req.dto';
import { ThemeResDto } from './dto/theme.res.dto';
import { UpdateThemeReqDto } from './dto/update-theme.req.dto';
import { ThemeService } from './theme.service';

@ApiTags('Themes')
@Controller({ path: 'themes', version: '1' })
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  @Get('runtime/current')
  @ApiPublic({ type: ThemeResDto, summary: 'Get current runtime theme' })
  getCurrentRuntimeTheme(
    @Query(
      'target',
      new DefaultValuePipe(EThemeTarget.ADMIN),
      new ParseEnumPipe(EThemeTarget),
    )
    target: EThemeTarget,
  ): Promise<ThemeResDto | null> {
    return this.themeService.getCurrentRuntimeTheme(target);
  }

  @Get()
  @UseGuards(AdminAuthGuard, PoliciesGuard)
  @ApiAuth({
    type: ThemeResDto,
    summary: 'Get paginated themes',
    isPaginated: true,
    paginateOptions: {
      sortableColumns: [
        'id',
        'name',
        'slug',
        'status',
        'isDefault',
        'createdAt',
        'updatedAt',
      ],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        name: [FilterOperator.ILIKE],
        slug: [FilterOperator.ILIKE],
        status: [FilterOperator.EQ, FilterOperator.IN],
        isDefault: [FilterOperator.EQ],
      },
    },
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Theme),
  )
  findAll(@Paginate() query: PaginateQuery): Promise<Paginated<ThemeResDto>> {
    return this.themeService.findAll(query);
  }

  @Post()
  @UseGuards(AdminAuthGuard, PoliciesGuard)
  @ApiAuth({ type: ThemeResDto, summary: 'Create theme' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.Theme),
  )
  create(
    @Body() dto: CreateThemeReqDto,
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<ThemeResDto> {
    return this.themeService.create(dto, adminId);
  }

  @Post('import')
  @UseGuards(AdminAuthGuard, PoliciesGuard)
  @ApiAuth({ type: ThemeResDto, summary: 'Import theme' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.Theme),
  )
  importTheme(
    @Body() dto: CreateThemeReqDto,
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<ThemeResDto> {
    return this.themeService.create(dto, adminId);
  }

  @Get(':id/export')
  @UseGuards(AdminAuthGuard, PoliciesGuard)
  @ApiAuth({ type: ThemeResDto, summary: 'Export theme' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Theme),
  )
  exportTheme(@Param('id') id: AutoIncrementID): Promise<ThemeResDto> {
    return this.themeService.findOne(id);
  }

  @Get(':id')
  @UseGuards(AdminAuthGuard, PoliciesGuard)
  @ApiAuth({ type: ThemeResDto, summary: 'Find theme by id' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Theme),
  )
  findOne(@Param('id') id: AutoIncrementID): Promise<ThemeResDto> {
    return this.themeService.findOne(id);
  }

  @Put(':id')
  @UseGuards(AdminAuthGuard, PoliciesGuard)
  @ApiAuth({ type: ThemeResDto, summary: 'Update theme' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.Theme),
  )
  update(
    @Param('id') id: AutoIncrementID,
    @Body() dto: UpdateThemeReqDto,
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<ThemeResDto> {
    return this.themeService.update(id, dto, adminId);
  }

  @Post(':id/duplicate')
  @UseGuards(AdminAuthGuard, PoliciesGuard)
  @ApiAuth({ type: ThemeResDto, summary: 'Duplicate theme' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.Theme),
  )
  duplicate(
    @Param('id') id: AutoIncrementID,
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<ThemeResDto> {
    return this.themeService.duplicate(id, adminId);
  }

  @Post(':id/publish')
  @UseGuards(AdminAuthGuard, PoliciesGuard)
  @ApiAuth({ type: ThemeResDto, summary: 'Publish theme' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Publish, AppSubjects.Theme),
  )
  publish(
    @Param('id') id: AutoIncrementID,
    @Body() dto: PublishThemeReqDto,
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<ThemeResDto> {
    return this.themeService.publish(id, dto.target, adminId);
  }

  @Post(':id/unpublish')
  @UseGuards(AdminAuthGuard, PoliciesGuard)
  @ApiAuth({ type: ThemeResDto, summary: 'Unpublish theme' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Publish, AppSubjects.Theme),
  )
  unpublish(
    @Param('id') id: AutoIncrementID,
    @Body() dto: Partial<PublishThemeReqDto>,
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<ThemeResDto> {
    return this.themeService.unpublish(id, dto.target, adminId);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard, PoliciesGuard)
  @ApiAuth({ summary: 'Delete theme' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Delete, AppSubjects.Theme),
  )
  remove(@Param('id') id: AutoIncrementID): Promise<void> {
    return this.themeService.remove(id);
  }
}
