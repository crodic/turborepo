import { AdminUserResDto } from '@/api/admin-user/dto/admin-user.res.dto';
import { ChangePasswordReqDto } from '@/api/admin-user/dto/change-password.req.dto';
import { ChangePasswordResDto } from '@/api/admin-user/dto/change-password.res.dto';
import { UpdateMeReqDto } from '@/api/admin-user/dto/update-me.req.dto';
import { SessionService } from '@/api/session/session.service';
import { TwoFactorService } from '@/api/two-factor/two-factor.service';
import { UserService } from '@/api/user/user.service';
import { AutoIncrementID } from '@/common/types/common.type';
import { DomainType } from '@/constants/entity.enum';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { Domain } from '@/decorators/domain.decorator';
import {
  ApiAuth,
  ApiAuthOptional,
  ApiPublic,
} from '@/decorators/http.decorators';
import { SkipPolicies } from '@/decorators/skip-policies.decorator';
import { FilesystemService } from '@/filesystem/filesystem.service';
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
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { plainToInstance } from 'class-transformer';
import type { Response } from 'express';
import { AdminUserLoginReqDto } from '../dto/admin-users/admin-user-login.req.dto';
import { AdminUserLoginResDto } from '../dto/admin-users/admin-user-login.res.dto';
import { LoginActivityResDto } from '../dto/admin-users/login-activity.res.dto';
import { ForgotPasswordReqDto } from '../dto/forgot-password.req.dto';
import { ForgotPasswordResDto } from '../dto/forgot-password.res.dto';
import { RefreshReqDto } from '../dto/refresh.req.dto';
import { RefreshResDto } from '../dto/refresh.res.dto';
import { ResendEmailVerifyReqDto } from '../dto/resend-email-verify.req.dto';
import { ResendEmailVerifyResDto } from '../dto/resend-email-verify.res.dto';
import { ResetPasswordReqDto } from '../dto/reset-password.req.dto';
import { ResetPasswordResDto } from '../dto/reset-password.res.dto';
import { SessionResDto } from '../dto/session.res.dto';
import {
  DisableTwoFactorReqDto,
  DisableTwoFactorResDto,
  EnableTwoFactorReqDto,
  EnableTwoFactorResDto,
  GenerateBackupCodesResDto,
  TwoFactorStatusResDto,
  VerifyTwoFactorLoginReqDto,
  VerifyTwoFactorSetupReqDto,
  VerifyTwoFactorSetupResDto,
} from '../dto/two-factor';
import { ProdOnlyThrottleGuard } from '../guards/ProdOnlyThrottle.guard';
import { AuthService } from '../services/auth.service';
import { clearAuthCookies, setAuthCookies } from '../utils/auth-cookie.util';

@ApiTags('Admin Authentication')
@Controller({
  path: 'auth',
  version: '1',
})
@Domain(DomainType.ADMIN)
@UseGuards(ProdOnlyThrottleGuard)
export class AdminAuthenticationController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly authSessionService: SessionService,
    private readonly adminTwoFactorService: TwoFactorService,
    private readonly filesystemService: FilesystemService,
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
    const result = await this.authService.login(
      adminUserLogin,
      DomainType.ADMIN,
      {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    );
    setAuthCookies({
      res,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenExpires: result.tokenExpires,
      domain: DomainType.ADMIN,
    });
    return plainToInstance(AdminUserLoginResDto, result);
  }

  @ApiAuth({
    summary: 'Admin Logout API',
  })
  @Post('logout')
  async logout(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(user.id, user.sid ?? user.sessionId);
    clearAuthCookies(res, DomainType.ADMIN);
    return { message: 'Đăng xuất thành công' };
  }

  @ApiAuthOptional({
    type: RefreshResDto,
    summary: 'Admin Refresh Token API',
  })
  @Post('refresh')
  async refresh(
    @Body() body: RefreshReqDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResDto> {
    const refreshToken = req.cookies?.refreshToken || body.refreshToken;
    const result = await this.authService.refreshToken(
      refreshToken,
      DomainType.ADMIN,
    );
    setAuthCookies({
      res,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenExpires: result.tokenExpires,
      domain: DomainType.ADMIN,
    });
    return result;
  }

  @ApiAuth({
    type: AdminUserResDto,
    summary: 'Get Current Admin Profile',
  })
  @SkipPolicies()
  @Get('me')
  async me(
    @CurrentUser('id') userId: AutoIncrementID,
  ): Promise<AdminUserResDto> {
    const user = await this.userService.getProfile(userId, DomainType.ADMIN);
    return plainToInstance(AdminUserResDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @ApiAuth({
    type: AdminUserResDto,
    summary: 'Update Current Admin Profile',
  })
  @SkipPolicies()
  @Put('me')
  async updateMe(
    @CurrentUser('id') userId: AutoIncrementID,
    @Body() dto: UpdateMeReqDto,
  ): Promise<AdminUserResDto> {
    const user = await this.userService.updateProfile(
      userId,
      DomainType.ADMIN,
      dto,
    );
    return plainToInstance(AdminUserResDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @ApiAuth({
    type: ChangePasswordResDto,
    summary: 'Change Current Admin Password',
  })
  @SkipPolicies()
  @Post('change-password')
  async changePassword(
    @CurrentUser('id') userId: AutoIncrementID,
    @Body() dto: ChangePasswordReqDto,
  ): Promise<ChangePasswordResDto> {
    await this.authService.changePassword(userId, dto);
    return plainToInstance(ChangePasswordResDto, {
      message: 'Password changed successfully',
    });
  }

  @ApiPublic({
    type: ForgotPasswordResDto,
    summary: 'Forgot Password API for Admin',
  })
  @Post('forgot-password')
  async forgotPassword(
    @Body() dto: ForgotPasswordReqDto,
  ): Promise<ForgotPasswordResDto> {
    const result = await this.authService.forgotPassword(dto, DomainType.ADMIN);
    return plainToInstance(ForgotPasswordResDto, result);
  }

  @ApiPublic({
    type: ResetPasswordResDto,
    summary: 'Reset Password API for Admin',
  })
  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordReqDto,
  ): Promise<ResetPasswordResDto> {
    const result = await this.authService.resetPassword(dto, DomainType.ADMIN);
    return plainToInstance(ResetPasswordResDto, result);
  }

  @ApiPublic({
    summary: 'Verify Admin Email',
  })
  @Get('verify-email')
  async verifyEmail(
    @Query('token') token: string,
  ): Promise<{ message: string }> {
    return await this.authService.verifyEmail(token, DomainType.ADMIN);
  }

  @ApiPublic({
    type: ResendEmailVerifyResDto,
    summary: 'Resend Email Verification for Admin',
  })
  @Post('resend-email-verify')
  async resendEmailVerify(
    @Body() dto: ResendEmailVerifyReqDto,
  ): Promise<ResendEmailVerifyResDto> {
    const result = await this.authService.resendVerificationEmail(
      dto,
      DomainType.ADMIN,
    );
    return plainToInstance(ResendEmailVerifyResDto, result);
  }

  // --- Two-Factor Authentication ---

  @ApiAuth({
    type: TwoFactorStatusResDto,
    summary: 'Get 2FA status for Admin',
  })
  @SkipPolicies()
  @Get('two-factor/status')
  async twoFactorStatus(
    @CurrentUser() user: any,
  ): Promise<TwoFactorStatusResDto> {
    return await this.adminTwoFactorService.twoFactorStatus(user);
  }

  @ApiAuth({
    type: EnableTwoFactorResDto,
    summary: 'Enable 2FA for Admin',
  })
  @SkipPolicies()
  @Post('two-factor/enable')
  async enableTwoFactor(
    @CurrentUser() user: any,
    @Body() dto: EnableTwoFactorReqDto,
  ): Promise<EnableTwoFactorResDto> {
    return await this.adminTwoFactorService.enableTwoFactor(user, dto);
  }

  @ApiAuth({
    type: VerifyTwoFactorSetupResDto,
    summary: 'Verify 2FA setup for Admin',
  })
  @SkipPolicies()
  @Post('two-factor/verify-setup')
  async verifyTwoFactorSetup(
    @CurrentUser() user: any,
    @Body() dto: VerifyTwoFactorSetupReqDto,
  ): Promise<VerifyTwoFactorSetupResDto> {
    return await this.adminTwoFactorService.verifyTwoFactorSetup(user, dto);
  }

  @ApiAuth({
    type: DisableTwoFactorResDto,
    summary: 'Disable 2FA for Admin',
  })
  @SkipPolicies()
  @Post('two-factor/disable')
  async disableTwoFactor(
    @CurrentUser() user: any,
    @Body() dto: DisableTwoFactorReqDto,
  ): Promise<DisableTwoFactorResDto> {
    return await this.adminTwoFactorService.disableTwoFactor(user, dto);
  }

  @ApiAuth({
    type: GenerateBackupCodesResDto,
    summary: 'Generate 2FA backup codes for Admin',
  })
  @SkipPolicies()
  @Post('two-factor/generate-backup-codes')
  async generateBackupCodes(
    @CurrentUser() user: any,
    @Body() dto: EnableTwoFactorReqDto,
  ): Promise<GenerateBackupCodesResDto> {
    return await this.adminTwoFactorService.generateTwoFactorBackupCodes(
      user,
      dto,
    );
  }

  @ApiPublic({
    type: AdminUserLoginResDto,
    summary: 'Verify 2FA Login for Admin',
  })
  @Post('two-factor/verify-login')
  async verifyTwoFactorLogin(
    @Body() dto: VerifyTwoFactorLoginReqDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AdminUserLoginResDto> {
    const result = await this.adminTwoFactorService.verifyTwoFactorLogin(
      dto,
      DomainType.ADMIN,
      {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    );
    setAuthCookies({
      res,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenExpires: result.tokenExpires,
      domain: DomainType.ADMIN,
    });
    return result;
  }

  // --- Sessions Management ---

  @ApiAuth({
    type: SessionResDto,
    summary: 'List active sessions for Admin',
  })
  @SkipPolicies()
  @Get('sessions')
  async listSessions(@CurrentUser() user: any): Promise<SessionResDto[]> {
    return await this.authSessionService.listSessions(user, DomainType.ADMIN);
  }

  @ApiAuth({
    type: LoginActivityResDto,
    summary: 'Get login activity for Admin',
  })
  @SkipPolicies()
  @Get('sessions/activity')
  async getLoginActivity(
    @CurrentUser() user: any,
  ): Promise<LoginActivityResDto> {
    return await this.authSessionService.getLoginActivity(
      user,
      DomainType.ADMIN,
    );
  }

  @ApiAuth({
    summary: 'Revoke a session for Admin',
  })
  @SkipPolicies()
  @Delete('sessions/:id')
  async revokeSession(
    @CurrentUser() user: any,
    @Param('id') sessionId: AutoIncrementID,
  ): Promise<{ message: string }> {
    return await this.authSessionService.revokeSessionById(
      user,
      DomainType.ADMIN,
      sessionId,
    );
  }

  @ApiAuth({
    summary: 'Revoke all other sessions for Admin',
  })
  @SkipPolicies()
  @Delete('sessions')
  async revokeAllSessions(
    @CurrentUser() user: any,
  ): Promise<{ message: string }> {
    return await this.authSessionService.revokeAllSessions(
      user,
      DomainType.ADMIN,
    );
  }

  @ApiAuth({
    summary: 'Upload Admin Avatar',
  })
  @SkipPolicies()
  @ApiConsumes('multipart/form-data')
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser('id') userId: AutoIncrementID,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<{ avatarUrl: string }> {
    const publicDisk = this.filesystemService.disk('public');
    const filename = `${Date.now()}-${file.originalname}`;
    const key = `avatars/admin/${filename}`;
    await publicDisk.put(key, file.buffer);
    const url = publicDisk.url(key);
    const avatarUrl = await this.userService.updateAvatar(
      userId,
      DomainType.ADMIN,
      {
        fieldName: 'avatar',
        originalName: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        disk: 'public',
        path: key,
        url,
      },
    );
    return { avatarUrl };
  }

  @ApiAuth({
    summary: 'Delete Admin Avatar',
  })
  @SkipPolicies()
  @Delete('me/avatar')
  async deleteAvatar(
    @CurrentUser('id') userId: AutoIncrementID,
  ): Promise<{ avatarUrl: null; message: string }> {
    await this.userService.deleteAvatar(userId, DomainType.ADMIN);
    return { avatarUrl: null, message: 'Avatar deleted successfully' };
  }
}
