import { AutoIncrementID } from '@/common/types/common.type';
import { ApiAuth } from '@/decorators/http.decorators';
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
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import {
  FilterOperator,
  Paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { CreateUserReqDto } from './dto/create-user.req.dto';
import { UpdateUserReqDto } from './dto/update-user.req.dto';
import { UserResDto } from './dto/user.res.dto';
import { UserService } from './user.service';

@ApiTags('Users')
@Controller({
  path: 'users',
  version: '1',
})
@UseGuards(AdminAuthGuard, PoliciesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiAuth({
    type: UserResDto,
    summary: 'Get paginated list of users',
    description: `Retrieve a paginated list of users for Admin.

Features:
- Pagination (page, limit)
- Full-text search on: username, email
- Sorting on: id, email, username, created_at, updated_at (default: id DESC)
- Auto-loading relation: posts
- Multi-word search supported
- Advanced filters:
  • createdAt: BETWEEN
  • email: ILIKE
  • fullName: ILIKE
  • id: EQ

Response includes paginated data, metadata, and navigation links.`,
    isPaginated: true,
    paginateOptions: {
      searchableColumns: ['email'],
      sortableColumns: ['id', 'email', 'createdAt', 'updatedAt'],
      defaultSortBy: [['id', 'DESC']],
      relations: ['posts'],
      multiWordSearch: true,
      filterableColumns: {
        createdAt: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.BTW],
        email: [FilterOperator.ILIKE],
        fullName: [FilterOperator.ILIKE],
        id: [FilterOperator.EQ],
      },
    },
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.User),
  )
  findAll(@Paginate() query: PaginateQuery): Promise<Paginated<UserResDto>> {
    return this.userService.findAllUser(query);
  }

  @Post()
  @ApiAuth({
    type: UserResDto,
    summary: 'Create user',
    statusCode: HttpStatus.CREATED,
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.User),
  )
  async createUser(
    @Body() createUserDto: CreateUserReqDto,
  ): Promise<UserResDto> {
    return await this.userService.create(createUserDto);
  }

  @Get(':id')
  @ApiAuth({ type: UserResDto, summary: 'Find user by id' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.User),
  )
  async findUser(@Param('id') id: AutoIncrementID): Promise<UserResDto> {
    return await this.userService.findOne(id);
  }

  @Put(':id')
  @ApiAuth({ type: UserResDto, summary: 'Update user' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.User),
  )
  updateUser(
    @Param('id') id: AutoIncrementID,
    @Body() reqDto: UpdateUserReqDto,
  ) {
    return this.userService.update(id, reqDto);
  }

  @Delete(':id')
  @ApiAuth({
    summary: 'Delete user',
    errorResponses: [400, 401, 403, 404, 500],
  })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Delete, AppSubjects.User),
  )
  removeUser(@Param('id') id: AutoIncrementID) {
    return this.userService.remove(id);
  }
}
