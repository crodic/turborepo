import { AutoIncrementID } from '@/common/types/common.type';
import { EWhiteLabelTarget } from '@/constants/entity.enum';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { CheckPolicies } from '@/decorators/policies.decorator';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { AppAbility } from '@/libs/casl/ability.factory';
import { AppActions, AppSubjects } from '@/utils/permissions.constant';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  FilterOperator,
  Paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import {
  WHITE_LABEL_MAX_FILE_SIZE,
  whiteLabelUploadOptions,
} from './configs/multer.config';
import { ActiveWhiteLabelResDto } from './dto/active-white-label.res.dto';
import { CreateWhiteLabelReqDto } from './dto/create-white-label.req.dto';
import { UpdateWhiteLabelReqDto } from './dto/update-white-label.req.dto';
import { WhiteLabelResDto } from './dto/white-label.res.dto';
import {
  WhiteLabelService,
  WhiteLabelUploadFiles,
} from './white-label.service';

@ApiTags('White Labels')
@Controller({ path: 'white-labels', version: '1' })
export class WhiteLabelController {
  constructor(private readonly whiteLabelService: WhiteLabelService) {}

  private validateFiles(files: WhiteLabelUploadFiles): void {
    const uploadedFiles = Object.values(files ?? {}).flatMap(
      (value) => value ?? [],
    );

    for (const file of uploadedFiles) {
      if (file.size > WHITE_LABEL_MAX_FILE_SIZE) {
        throw new BadRequestException(
          `Validation failed (expected file size < ${WHITE_LABEL_MAX_FILE_SIZE} bytes)`,
        );
      }

      if (
        ![
          'image/png',
          'image/webp',
          'image/jpeg',
          'image/x-icon',
          'image/svg+xml',
        ].includes(file.mimetype)
      ) {
        throw new BadRequestException(
          'Validation failed (expected image PNG, WebP, JPEG, SVG or ICO)',
        );
      }
    }
  }

  @Get('active')
  @ApiPublic({
    type: ActiveWhiteLabelResDto,
    summary: 'Get active white label configuration',
  })
  @ApiQuery({
    name: 'target',
    enum: EWhiteLabelTarget,
    required: false,
    description: 'Target application (admin or client, default: admin)',
  })
  getActiveWhiteLabel(
    @Query('target') target?: EWhiteLabelTarget,
  ): Promise<ActiveWhiteLabelResDto | null> {
    return this.whiteLabelService.getActiveWhiteLabel(
      target ?? EWhiteLabelTarget.ADMIN,
    );
  }

  @Get()
  @UseGuards(AdminAuthGuard, PoliciesGuard)
  @ApiAuth({
    type: WhiteLabelResDto,
    summary: 'Get paginated white label profiles',
    isPaginated: true,
    paginateOptions: {
      sortableColumns: [
        'id',
        'name',
        'slug',
        'target',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        name: [FilterOperator.ILIKE],
        slug: [FilterOperator.ILIKE],
        target: [FilterOperator.EQ, FilterOperator.IN],
        isActive: [FilterOperator.EQ],
      },
    },
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.WhiteLabel),
  )
  findAll(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<WhiteLabelResDto>> {
    return this.whiteLabelService.findAll(query);
  }

  @Get(':id')
  @UseGuards(AdminAuthGuard, PoliciesGuard)
  @ApiAuth({
    type: WhiteLabelResDto,
    summary: 'Find white label profile by ID',
  })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.WhiteLabel),
  )
  findOne(@Param('id') id: AutoIncrementID): Promise<WhiteLabelResDto> {
    return this.whiteLabelService.findOne(id);
  }

  @Post()
  @UseGuards(AdminAuthGuard, PoliciesGuard)
  @ApiConsumes('multipart/form-data')
  @ApiAuth({ type: WhiteLabelResDto, summary: 'Create white label profile' })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'site_logo', maxCount: 1 },
        { name: 'site_dark_logo', maxCount: 1 },
        { name: 'site_favicon', maxCount: 1 },
        { name: 'og_image', maxCount: 1 },
        { name: 'twitter_image', maxCount: 1 },
      ],
      whiteLabelUploadOptions,
    ),
  )
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.WhiteLabel),
  )
  create(
    @Body() dto: CreateWhiteLabelReqDto,
    @UploadedFiles() files: WhiteLabelUploadFiles = {},
    @CurrentUser('id') adminId?: AutoIncrementID,
  ): Promise<WhiteLabelResDto> {
    this.validateFiles(files);
    return this.whiteLabelService.create(dto, files, adminId);
  }

  @Put(':id')
  @UseGuards(AdminAuthGuard, PoliciesGuard)
  @ApiConsumes('multipart/form-data')
  @ApiAuth({ type: WhiteLabelResDto, summary: 'Update white label profile' })
  @ApiParam({ name: 'id', type: 'String' })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'site_logo', maxCount: 1 },
        { name: 'site_dark_logo', maxCount: 1 },
        { name: 'site_favicon', maxCount: 1 },
        { name: 'og_image', maxCount: 1 },
        { name: 'twitter_image', maxCount: 1 },
      ],
      whiteLabelUploadOptions,
    ),
  )
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.WhiteLabel),
  )
  update(
    @Param('id') id: AutoIncrementID,
    @Body() dto: UpdateWhiteLabelReqDto,
    @UploadedFiles() files: WhiteLabelUploadFiles = {},
    @CurrentUser('id') adminId?: AutoIncrementID,
  ): Promise<WhiteLabelResDto> {
    this.validateFiles(files);
    return this.whiteLabelService.update(id, dto, files, adminId);
  }

  @Post(':id/activate')
  @UseGuards(AdminAuthGuard, PoliciesGuard)
  @ApiAuth({
    type: WhiteLabelResDto,
    summary: 'Activate white label profile for target',
  })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Publish, AppSubjects.WhiteLabel),
  )
  activate(
    @Param('id') id: AutoIncrementID,
    @CurrentUser('id') adminId?: AutoIncrementID,
  ): Promise<WhiteLabelResDto> {
    return this.whiteLabelService.activate(id, adminId);
  }

  @Post(':id/deactivate')
  @UseGuards(AdminAuthGuard, PoliciesGuard)
  @ApiAuth({
    type: WhiteLabelResDto,
    summary: 'Deactivate white label profile',
  })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Publish, AppSubjects.WhiteLabel),
  )
  deactivate(
    @Param('id') id: AutoIncrementID,
    @CurrentUser('id') adminId?: AutoIncrementID,
  ): Promise<WhiteLabelResDto> {
    return this.whiteLabelService.deactivate(id, adminId);
  }

  @Post(':id/duplicate')
  @UseGuards(AdminAuthGuard, PoliciesGuard)
  @ApiAuth({
    type: WhiteLabelResDto,
    summary: 'Duplicate white label profile',
  })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.WhiteLabel),
  )
  duplicate(
    @Param('id') id: AutoIncrementID,
    @CurrentUser('id') adminId?: AutoIncrementID,
  ): Promise<WhiteLabelResDto> {
    return this.whiteLabelService.duplicate(id, adminId);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard, PoliciesGuard)
  @ApiAuth({ summary: 'Delete white label profile' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Delete, AppSubjects.WhiteLabel),
  )
  remove(@Param('id') id: AutoIncrementID): Promise<void> {
    return this.whiteLabelService.remove(id);
  }
}
