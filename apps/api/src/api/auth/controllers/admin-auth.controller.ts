import { avatarUploadOption } from '@/api/admin-user/configs/multer.config';
import { AdminUserResDto } from '@/api/admin-user/dto/admin-user.res.dto';
import { ChangePasswordReqDto } from '@/api/admin-user/dto/change-password.req.dto';
import { ChangePasswordResDto } from '@/api/admin-user/dto/change-password.res.dto';
import { UpdateMeReqDto } from '@/api/admin-user/dto/update-me.req.dto';
import { AutoIncrementID } from '@/common/types/common.type';
import { CurrentUser } from '@/decorators/current-user.decorator';
import {
  ApiAuth,
  ApiAuthOptional,
  ApiPublic,
} from '@/decorators/http.decorators';
import { CheckPolicies } from '@/decorators/policies.decorator';
import { SkipPolicies } from '@/decorators/skip-policies.decorator';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { AppAbility } from '@/libs/casl/ability.factory';
import { AppActions, AppSubjects } from '@/utils/permissions.constant';
import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AdminUserLoginReqDto } from '../dto/admin-users/admin-user-login.req.dto';
import { AdminUserLoginResDto } from '../dto/admin-users/admin-user-login.res.dto';
import { AdminUserRegisterReqDto } from '../dto/admin-users/admin-user-register.req.dto';
import { ImpersonateUserReqDto } from '../dto/admin-users/impersonate-user.req.dto';
import { ImpersonateUserResDto } from '../dto/admin-users/impersonate-user.res.dto';
import { DisableTwoFactorReqDto } from '../dto/admin-users/two-factor/disable-two-factor.req.dto';
import { DisableTwoFactorResDto } from '../dto/admin-users/two-factor/disable-two-factor.res.dto';
import { EnableTwoFactorReqDto } from '../dto/admin-users/two-factor/enable-two-factor.req.dto';
import { EnableTwoFactorResDto } from '../dto/admin-users/two-factor/enable-two-factor.res.dto';
import { GenerateBackupCodesResDto } from '../dto/admin-users/two-factor/generate-backup-codes.res.dto';
import { TwoFactorStatusResDto } from '../dto/admin-users/two-factor/two-factor-status.res.dto';
import { VerifyTwoFactorLoginReqDto } from '../dto/admin-users/two-factor/verify-two-factor-login.req.dto';
import { VerifyTwoFactorSetupReqDto } from '../dto/admin-users/two-factor/verify-two-factor-setup.req.dto';
import { VerifyTwoFactorSetupResDto } from '../dto/admin-users/two-factor/verify-two-factor-setup.res.dto';
import { ForgotPasswordReqDto } from '../dto/forgot-password.req.dto';
import { ForgotPasswordResDto } from '../dto/forgot-password.res.dto';
import { RefreshReqDto } from '../dto/refresh.req.dto';
import { RefreshResDto } from '../dto/refresh.res.dto';
import { RegisterResDto } from '../dto/register.res.dto';
import { ResendEmailVerifyReqDto } from '../dto/resend-email-verify.req.dto';
import { ResendEmailVerifyResDto } from '../dto/resend-email-verify.res.dto';
import { ResetPasswordReqDto } from '../dto/reset-password.req.dto';
import { ResetPasswordResDto } from '../dto/reset-password.res.dto';
import { SessionResDto } from '../dto/session.res.dto';
import { ProdOnlyThrottleGuard } from '../guards/ProdOnlyThrottle.guard';
import { AdminAuthService } from '../services/admin-auth.service';
import { JwtPayloadType } from '../types/jwt-payload.type';
import { clearAuthCookies, setAuthCookies } from '../utils/auth-cookie.util';

@ApiTags('Authentication')
@Controller({
  path: 'auth',
  version: '1',
})
@UseGuards(AdminAuthGuard, PoliciesGuard, ProdOnlyThrottleGuard)
export class AdminAuthenticationController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly configService: ConfigService,
  ) {}

  @ApiPublic({
    type: AdminUserLoginResDto,
    summary: 'Admin Login API',
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async login(
    @Body() adminUserLogin: AdminUserLoginReqDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AdminUserLoginResDto> {
    const result = await this.adminAuthService.login(adminUserLogin, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
    setAuthCookies({
      res,
      configService: this.configService,
      prefix: 'admin',
      tokens: result,
    });
    return result;
  }

  @ApiPublic({
    type: AdminUserLoginResDto,
    summary: 'Verify admin login two-factor code',
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('2fa/verify-login')
  async verifyTwoFactorLogin(
    @Body() dto: VerifyTwoFactorLoginReqDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AdminUserLoginResDto> {
    const result = await this.adminAuthService.verifyTwoFactorLogin(dto, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
    setAuthCookies({
      res,
      configService: this.configService,
      prefix: 'admin',
      tokens: result,
    });
    return result;
  }

  @ApiPublic({
    type: RegisterResDto,
    summary: 'Admin Register API',
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  async register(
    @Body() dto: AdminUserRegisterReqDto,
  ): Promise<RegisterResDto> {
    return await this.adminAuthService.register(dto);
  }

  @ApiPublic({
    type: RefreshResDto,
    summary: 'Refresh token',
  })
  @SkipThrottle()
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshReqDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResDto> {
    const result = await this.adminAuthService.refreshToken(dto);
    setAuthCookies({
      res,
      configService: this.configService,
      prefix: 'admin',
      tokens: result,
    });
    return result;
  }

  @ApiAuthOptional({
    summary: 'Logout for portal',
    errorResponses: [304, 500, 401, 403],
    statusCode: 204,
  })
  @SkipThrottle()
  @SkipPolicies()
  @Post('logout')
  async logout(
    @CurrentUser() userToken?: JwtPayloadType,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<void> {
    if (userToken) {
      await this.adminAuthService.logout(userToken);
    }
    if (res) {
      clearAuthCookies({
        res,
        configService: this.configService,
        prefix: 'admin',
      });
    }
  }

  @ApiAuth({
    type: SessionResDto,
    summary: 'List current admin sessions',
  })
  @SkipThrottle()
  @Get('sessions')
  async sessions(@CurrentUser() userToken: JwtPayloadType) {
    return this.adminAuthService.listSessions(userToken);
  }

  @ApiAuth({ summary: 'Revoke all current admin sessions' })
  @SkipThrottle()
  @Delete('sessions')
  async revokeAllSessions(@CurrentUser() userToken: JwtPayloadType) {
    return this.adminAuthService.revokeAllSessions(userToken);
  }

  @ApiAuth({ summary: 'Revoke one current admin session' })
  @SkipThrottle()
  @Delete('sessions/:id')
  async revokeSession(
    @CurrentUser() userToken: JwtPayloadType,
    @Param('id') sessionId: AutoIncrementID,
  ) {
    return this.adminAuthService.revokeSession(userToken, sessionId);
  }

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
    return this.adminAuthService.impersonateUser(userToken, dto, {
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
    return this.adminAuthService.findActiveUserImpersonationSession(
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
    return this.adminAuthService.stopUserImpersonation(userToken, userId, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
      method: req.method,
      endpoint: req.originalUrl || req.url,
    });
  }

  @ApiPublic({
    type: ForgotPasswordResDto,
    summary: 'Forgot password',
  })
  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async forgotPassword(
    @Body() dto: ForgotPasswordReqDto,
  ): Promise<ForgotPasswordResDto> {
    return await this.adminAuthService.forgotPassword(dto);
  }

  @ApiPublic({ summary: 'Verify account' })
  @ApiQuery({ name: 'token', type: 'string' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Get('verify')
  async verifyAccount(@Query('token') token: string, @Res() res: Response) {
    try {
      await this.adminAuthService.verifyAccount(token);
      return res.redirect(this.getVerificationRedirectUrl('success'));
    } catch {
      return res.redirect(this.getVerificationRedirectUrl('failed'));
    }
  }

  @ApiPublic({
    type: ResendEmailVerifyResDto,
    summary: 'Resend verify email',
  })
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @Post('verify/resend')
  async resendVerifyEmail(
    @Body() dto: ResendEmailVerifyReqDto,
  ): Promise<ResendEmailVerifyResDto> {
    return this.adminAuthService.resendVerifyEmail(dto);
  }

  @ApiPublic({ type: ResetPasswordResDto, summary: 'Reset password' })
  @ApiQuery({ name: 'token', type: 'string' })
  @SkipThrottle()
  @Post('reset-password')
  async resetPassword(
    @Query('token') token: string,
    @Body() dto: ResetPasswordReqDto,
  ): Promise<ResetPasswordResDto> {
    return this.adminAuthService.resetPassword(token, dto);
  }

  @ApiAuth({
    type: AdminUserResDto,
    summary: 'Get current user',
  })
  @SkipThrottle()
  @Get('me')
  async me(
    @CurrentUser('id') userId: AutoIncrementID,
  ): Promise<AdminUserResDto> {
    return await this.adminAuthService.me(userId);
  }

  @ApiAuth({
    type: TwoFactorStatusResDto,
    summary: 'Get current admin two-factor status',
  })
  @SkipThrottle()
  @Get('me/2fa')
  async twoFactorStatus(
    @CurrentUser() userToken: JwtPayloadType,
  ): Promise<TwoFactorStatusResDto> {
    return this.adminAuthService.twoFactorStatus(userToken);
  }

  @ApiAuth({
    type: EnableTwoFactorResDto,
    summary: 'Start current admin two-factor setup',
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('me/2fa/enable')
  async enableTwoFactor(
    @CurrentUser() userToken: JwtPayloadType,
    @Body() dto: EnableTwoFactorReqDto,
  ): Promise<EnableTwoFactorResDto> {
    return this.adminAuthService.enableTwoFactor(userToken, dto);
  }

  @ApiAuth({
    type: VerifyTwoFactorSetupResDto,
    summary: 'Verify and enable current admin two-factor setup',
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('me/2fa/verify')
  async verifyTwoFactorSetup(
    @CurrentUser() userToken: JwtPayloadType,
    @Body() dto: VerifyTwoFactorSetupReqDto,
  ): Promise<VerifyTwoFactorSetupResDto> {
    return this.adminAuthService.verifyTwoFactorSetup(userToken, dto);
  }

  @ApiAuth({
    type: DisableTwoFactorResDto,
    summary: 'Disable current admin two-factor authentication',
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('me/2fa/disable')
  async disableTwoFactor(
    @CurrentUser() userToken: JwtPayloadType,
    @Body() dto: DisableTwoFactorReqDto,
  ): Promise<DisableTwoFactorResDto> {
    return this.adminAuthService.disableTwoFactor(userToken, dto);
  }

  @ApiAuth({
    type: GenerateBackupCodesResDto,
    summary: 'Generate new current admin two-factor backup codes',
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('me/2fa/backup-codes')
  async generateTwoFactorBackupCodes(
    @CurrentUser() userToken: JwtPayloadType,
    @Body() dto: EnableTwoFactorReqDto,
  ): Promise<GenerateBackupCodesResDto> {
    return this.adminAuthService.generateTwoFactorBackupCodes(userToken, dto);
  }

  @ApiConsumes('multipart/form-data')
  @ApiAuth({
    type: AdminUserResDto,
    summary: 'Update current user',
  })
  @SkipThrottle()
  @UseInterceptors(FileInterceptor('avatar', avatarUploadOption))
  @Put('me')
  async updateMe(
    @CurrentUser('id') userId: AutoIncrementID,
    @Body() reqDto: UpdateMeReqDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({
            fileType: /^image\/(png|webp|jpeg)$/,
            skipMagicNumbersValidation: true,
            errorMessage: 'Invalid file type',
          }),
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
            errorMessage: 'File too large',
          }),
        ],
        fileIsRequired: false,
      }),
    )
    image?: Express.Multer.File,
  ): Promise<{ message: string }> {
    return await this.adminAuthService.updateMe(userId, reqDto, image);
  }

  @ApiAuth({
    type: ChangePasswordResDto,
    summary: 'Change password',
    errorResponses: [400, 401, 403, 404, 500],
  })
  @SkipThrottle()
  @Post('me/change-password')
  async changePassword(
    @CurrentUser('id') userId: AutoIncrementID,
    @Body() reqDto: ChangePasswordReqDto,
  ): Promise<ChangePasswordResDto> {
    return this.adminAuthService.changePassword(userId, reqDto);
  }

  private getVerificationRedirectUrl(status: 'success' | 'failed') {
    const portalUrl =
      this.configService.get<string>('auth.portalUrl') ||
      this.getOriginFromUrl(
        this.configService.get<string>('auth.portalResetPasswordUrl'),
      ) ||
      'http://localhost:5173';
    const url = new URL('/sign-in', portalUrl);

    url.searchParams.set('verification', status);

    return url.toString();
  }

  private getOriginFromUrl(url?: string) {
    if (!url) {
      return null;
    }

    try {
      return new URL(url).origin;
    } catch {
      return null;
    }
  }
}
