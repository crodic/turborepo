import { LoginResDto } from '@/api/auth/dto/users/login.res.dto';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { AutoIncrementID } from '@/common/types/common.type';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { CheckPolicies } from '@/decorators/policies.decorator';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { UserAuthGuard } from '@/guards/user-auth.guard';
import { AppAbility } from '@/libs/casl/ability.factory';
import { AppActions, AppSubjects } from '@/utils/permissions.constant';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { SessionResDto } from '../auth/dto/session.res.dto';
import { ImpersonateUserReqDto } from './dto/impersonate-user.req.dto';
import { ImpersonateUserResDto } from './dto/impersonate-user.res.dto';
import { ImpersonationExchangeReqDto } from './dto/impersonation-exchange.req.dto';
import { ImpersonationService } from './impersonation.service';

@ApiTags('Authentication')
@Controller({
  path: 'auth',
  version: '1',
})
@UseGuards(AdminAuthGuard, PoliciesGuard)
export class AdminImpersonationController {
  constructor(private readonly impersonationService: ImpersonationService) {}

  @ApiAuth({
    type: ImpersonateUserResDto,
    summary: 'Impersonate user',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Impersonate, AppSubjects.User),
  )
  @SkipThrottle()
  @Post('impersonate-user')
  async impersonateUser(
    @CurrentUser() userToken: JwtPayloadType,
    @Body() dto: ImpersonateUserReqDto,
    @Req() req: any,
  ): Promise<ImpersonateUserResDto> {
    return this.impersonationService.impersonateUser(userToken, dto, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
      method: req.method,
      endpoint: req.originalUrl || req.url,
    });
  }

  @ApiAuth({
    type: SessionResDto,
    summary: 'Get active impersonation session for user',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Impersonate, AppSubjects.User),
  )
  @SkipThrottle()
  @Get('impersonate-user/:userId/active-session')
  async getActiveUserImpersonationSession(
    @CurrentUser() userToken: JwtPayloadType,
    @Param('userId') userId: AutoIncrementID,
  ): Promise<SessionResDto | null> {
    return this.impersonationService.findActiveUserImpersonationSession(
      userToken,
      userId,
    );
  }

  @ApiAuth({
    summary: 'Stop active impersonation session for user',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Impersonate, AppSubjects.User),
  )
  @SkipThrottle()
  @Post('impersonate-user/:userId/stop')
  async stopUserImpersonation(
    @CurrentUser() userToken: JwtPayloadType,
    @Param('userId') userId: AutoIncrementID,
    @Req() req: any,
  ) {
    return this.impersonationService.stopUserImpersonation(userToken, userId, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
      method: req.method,
      endpoint: req.originalUrl || req.url,
    });
  }
}

@ApiTags('User Authentication')
@Controller({
  path: 'user/auth',
  version: '1',
})
@UseGuards(UserAuthGuard)
export class UserImpersonationController {
  constructor(private readonly impersonationService: ImpersonationService) {}

  @ApiAuth({ summary: 'Stop impersonating user' })
  @SkipThrottle()
  @Post('stop-impersonating')
  async stopImpersonating(
    @CurrentUser() userToken: JwtPayloadType,
    @Request() req: any,
  ) {
    return this.impersonationService.stopImpersonating(userToken, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
      method: req.method,
      endpoint: req.originalUrl || req.url,
    });
  }

  @ApiPublic({
    type: LoginResDto,
    summary: 'Exchange impersonation login token',
  })
  @Post('impersonation/exchange')
  async exchangeImpersonationLogin(
    @Body() dto: ImpersonationExchangeReqDto,
  ): Promise<LoginResDto> {
    return this.impersonationService.exchangeImpersonationLogin(dto);
  }
}
