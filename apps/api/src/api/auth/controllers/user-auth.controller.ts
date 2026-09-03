import { SessionService } from '@/api/session/session.service';
import { TwoFactorService } from '@/api/two-factor/two-factor.service';
import { UserChangePasswordReqDto } from '@/api/user/dto/user-change-password.req.dto';
import { UserChangePasswordResDto } from '@/api/user/dto/user-change-password.res.dto';
import { UserResDto } from '@/api/user/dto/user.res.dto';
import { UserService } from '@/api/user/user.service';
import { AutoIncrementID } from '@/common/types/common.type';
import { DomainType, EAccountProvider } from '@/constants/entity.enum';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { Domain } from '@/decorators/domain.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { SkipPolicies } from '@/decorators/skip-policies.decorator';
import { GoogleOAuthGuard } from '@/guards/google-oauth.guard';
import { hashPassword } from '@/utils/password.util';
import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { plainToInstance } from 'class-transformer';
import type { Response } from 'express';
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
import { LoginReqDto } from '../dto/users/login.req.dto';
import { LoginResDto } from '../dto/users/login.res.dto';
import { RegisterReqDto } from '../dto/users/register.req.dto';
import { SetupInitialPasswordReqDto } from '../dto/users/setup-initial-password.req.dto';
import { SocialAccountResDto } from '../dto/users/social-account.res.dto';
import { SocialExchangeReqDto } from '../dto/users/social-exchange.req.dto';
import { SocialLinkUrlResDto } from '../dto/users/social-link-url.res.dto';
import { UpdateAuthUserMeReqDto } from '../dto/users/update-me.req.dto';
import { ProdOnlyThrottleGuard } from '../guards/ProdOnlyThrottle.guard';
import { AuthService } from '../services/auth.service';
import { SocialAuthService } from '../services/social-auth.service';
import { clearAuthCookies, setAuthCookies } from '../utils/auth-cookie.util';

@ApiTags('User Authentication')
@Controller({
  path: 'user/auth',
  version: '1',
})
@Domain(DomainType.CLIENT)
@UseGuards(ProdOnlyThrottleGuard)
export class UserAuthenticationController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly authSessionService: SessionService,
    private readonly socialAuthService: SocialAuthService,
    private readonly configService: ConfigService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  @ApiPublic({
    type: LoginResDto,
    summary: 'Sign-in for Client User',
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async signIn(
    @Body() userLoginDto: LoginReqDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResDto> {
    const result = await this.authService.login(
      userLoginDto,
      DomainType.CLIENT,
      {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    );
    if (!result.twoFactorRequired) {
      setAuthCookies({
        res,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        tokenExpires: result.tokenExpires,
        domain: DomainType.CLIENT,
      });
    }
    return plainToInstance(LoginResDto, result);
  }

  @ApiPublic({
    type: RegisterResDto,
    summary: 'Sign-up for Client User',
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  async signUp(
    @Body() dto: RegisterReqDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RegisterResDto> {
    const result = await this.authService.register(dto, DomainType.CLIENT, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
    setAuthCookies({
      res,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenExpires: result.tokenExpires,
      domain: DomainType.CLIENT,
    });
    return plainToInstance(RegisterResDto, result);
  }

  @ApiPublic({
    type: RefreshResDto,
    summary: 'Refresh token for Client User',
  })
  @SkipThrottle()
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshReqDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResDto> {
    const refreshToken = req.cookies?.refreshToken || dto.refreshToken;
    const result = await this.authService.refreshToken(
      refreshToken,
      DomainType.CLIENT,
    );
    setAuthCookies({
      res,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenExpires: result.tokenExpires,
      domain: DomainType.CLIENT,
    });
    return result;
  }

  @ApiAuth({
    summary: 'Logout for client',
    errorResponses: [304, 500, 401, 403],
  })
  @SkipThrottle()
  @SkipPolicies()
  @Post('logout')
  async logout(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(user.id, user.sid ?? user.sessionId);
    clearAuthCookies(res, DomainType.CLIENT);
  }

  @ApiAuth({
    type: SessionResDto,
    summary: 'List current user sessions',
  })
  @SkipThrottle()
  @Get('sessions')
  async sessions(@CurrentUser() user: any): Promise<SessionResDto[]> {
    return this.authSessionService.listSessions(user, DomainType.CLIENT);
  }

  @ApiAuth({ summary: 'Revoke all other current user sessions' })
  @SkipThrottle()
  @Delete('sessions')
  async revokeAllSessions(
    @CurrentUser() user: any,
  ): Promise<{ message: string }> {
    return this.authSessionService.revokeAllSessions(user, DomainType.CLIENT);
  }

  @ApiAuth({ summary: 'Revoke one current user session' })
  @SkipThrottle()
  @Delete('sessions/:id')
  async revokeSession(
    @CurrentUser() user: any,
    @Param('id') sessionId: AutoIncrementID,
  ): Promise<{ message: string }> {
    return this.authSessionService.revokeSessionById(
      user,
      DomainType.CLIENT,
      sessionId,
    );
  }

  @ApiPublic({ type: ForgotPasswordResDto, summary: 'Forgot password' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('forgot-password')
  async forgotPassword(
    @Body() dto: ForgotPasswordReqDto,
  ): Promise<ForgotPasswordResDto> {
    const result = await this.authService.forgotPassword(
      dto,
      DomainType.CLIENT,
    );
    return plainToInstance(ForgotPasswordResDto, result);
  }

  @ApiPublic({ type: ResetPasswordResDto, summary: 'Reset password' })
  @ApiQuery({ name: 'token', type: 'string' })
  @Post('reset-password')
  async resetPassword(
    @Query('token') token: string,
    @Body() dto: ResetPasswordReqDto,
  ): Promise<ResetPasswordResDto> {
    const result = await this.authService.resetPassword(
      { token: token, password: dto.password },
      DomainType.CLIENT,
    );
    return plainToInstance(ResetPasswordResDto, result);
  }

  @ApiPublic({ summary: 'Verify email' })
  @ApiQuery({ name: 'token', type: 'string' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('verify/email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    try {
      await this.authService.verifyEmail(token, DomainType.CLIENT);
      return res.redirect(this.getVerificationRedirectUrl('success'));
    } catch {
      return res.redirect(this.getVerificationRedirectUrl('failed'));
    }
  }

  @ApiPublic({
    type: ResendEmailVerifyResDto,
    summary: 'Resend verify email',
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify/email/resend')
  async resendVerifyEmail(
    @Body() dto: ResendEmailVerifyReqDto,
  ): Promise<ResendEmailVerifyResDto> {
    const result = await this.authService.resendVerificationEmail(
      dto,
      DomainType.CLIENT,
    );
    return plainToInstance(ResendEmailVerifyResDto, result);
  }

  @ApiPublic({ summary: 'Start Google OAuth login' })
  @Get('social/google')
  @UseGuards(GoogleOAuthGuard)
  async googleAuth() {
    return;
  }

  @ApiPublic({ summary: 'Handle Google OAuth callback' })
  @Get('social/google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
    try {
      const googleProfile = req.user;
      const state = req.query?.state;

      let user: any;
      if (state) {
        const stateData = await this.socialAuthService.consumeOAuthState(state);
        const existingUser = await this.userService.findById(
          stateData.userId as AutoIncrementID,
        );
        if (!existingUser) throw new NotFoundException('User not found');

        await this.userService.linkAccount({
          userId: existingUser.id,
          provider: EAccountProvider.GOOGLE,
          providerAccountId: googleProfile.id,
          type: 'oauth',
          tokens: {
            accessToken: googleProfile.accessToken,
            refreshToken: googleProfile.refreshToken,
          },
        });
        return res.redirect(
          this.socialAuthService.buildClientRedirectUrl('/profile', {
            linked: 'google',
          }),
        );
      }

      const existingAccount = await this.userService.findByOAuth(
        EAccountProvider.GOOGLE,
        googleProfile.id,
      );

      if (existingAccount) {
        user = existingAccount;
      } else {
        const existingEmailUser = await this.userService.findByEmailAndDomain(
          googleProfile.email,
          DomainType.CLIENT,
        );

        if (existingEmailUser) {
          await this.userService.linkAccount({
            userId: existingEmailUser.id,
            provider: EAccountProvider.GOOGLE,
            providerAccountId: googleProfile.id,
            type: 'oauth',
            tokens: {
              accessToken: googleProfile.accessToken,
              refreshToken: googleProfile.refreshToken,
            },
          });
          user = existingEmailUser;
        } else {
          user = await this.userService.createOAuthUser({
            email: googleProfile.email,
            firstName: googleProfile.firstName,
            lastName: googleProfile.lastName,
            avatarUrl: googleProfile.picture,
            domain: DomainType.CLIENT,
            provider: EAccountProvider.GOOGLE,
            providerAccountId: googleProfile.id,
            isEmailVerified: true,
            roles: await this.userService.findDefaultRole(DomainType.CLIENT),
            tokens: {
              accessToken: googleProfile.accessToken,
              refreshToken: googleProfile.refreshToken,
            },
          });
        }
      }

      const loginRes = await this.authService.login(
        { email: user.email },
        DomainType.CLIENT,
        {
          ipAddress: req.ip,
          userAgent: req.headers?.['user-agent'],
        },
      );

      const exchangeToken = await this.socialAuthService.createExchangeToken(
        loginRes as any,
      );

      return res.redirect(
        this.socialAuthService.buildClientRedirectUrl('/auth/social/callback', {
          token: exchangeToken,
        }),
      );
    } catch {
      return res.redirect(this.getSocialRedirectUrl('failed'));
    }
  }

  @ApiPublic({ type: LoginResDto, summary: 'Exchange social login token' })
  @Post('social/exchange')
  async exchangeSocialLogin(
    @Body() dto: SocialExchangeReqDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResDto> {
    const result = await this.socialAuthService.consumeExchangeToken(dto.token);
    setAuthCookies({
      res,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenExpires: result.tokenExpires,
      domain: DomainType.CLIENT,
    });
    return result;
  }

  @ApiAuth({
    type: SocialLinkUrlResDto,
    summary: 'Create Google link account URL',
  })
  @SkipThrottle()
  @Post('me/social/google/link')
  async createGoogleLinkUrl(
    @CurrentUser('id') userId: AutoIncrementID,
  ): Promise<SocialLinkUrlResDto> {
    const state = await this.socialAuthService.createOAuthState(userId);
    const callbackUrl = this.configService.getOrThrow(
      'auth.googleOAuthCallbackUrl',
    );
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.configService.get(
      'google.clientId',
    )}&redirect_uri=${encodeURIComponent(
      callbackUrl,
    )}&response_type=code&scope=email%20profile&state=${state}`;

    return plainToInstance(SocialLinkUrlResDto, { url: googleAuthUrl });
  }

  @ApiAuth({
    type: SocialAccountResDto,
    summary: 'List linked social accounts',
  })
  @SkipThrottle()
  @Get('me/social-accounts')
  async listSocialAccounts(
    @CurrentUser('id') userId: AutoIncrementID,
  ): Promise<SocialAccountResDto[]> {
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const accounts = user.accounts ?? [];
    return plainToInstance(
      SocialAccountResDto,
      accounts.map((acc) => ({
        id: acc.id,
        provider: acc.provider,
        providerAccountId: acc.providerAccountId,
        createdAt: acc.createdAt,
      })),
    );
  }

  @ApiAuth({
    type: UserChangePasswordResDto,
    summary: 'Change password',
    errorResponses: [400, 401, 403, 404, 500],
  })
  @SkipThrottle()
  @Post('me/change-password')
  async changePassword(
    @CurrentUser('id') userId: AutoIncrementID,
    @Body() reqDto: UserChangePasswordReqDto,
  ): Promise<UserChangePasswordResDto> {
    await this.authService.changePassword(userId, reqDto);
    return plainToInstance(UserChangePasswordResDto, {
      message: 'Password changed successfully',
    });
  }

  @ApiAuth({
    type: UserChangePasswordResDto,
    summary: 'Setup initial password for social-login users',
    errorResponses: [400, 401, 403, 404, 500],
  })
  @SkipThrottle()
  @Post('me/setup-password')
  async setupInitialPassword(
    @CurrentUser('id') userId: AutoIncrementID,
    @Body() reqDto: SetupInitialPasswordReqDto,
  ): Promise<UserChangePasswordResDto> {
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (user.password) {
      throw new ConflictException('Password already exists for this account');
    }
    user.password = await hashPassword(reqDto.password);
    await this.userService.save(user);
    return plainToInstance(UserChangePasswordResDto, {
      message: 'Password setup successfully',
    });
  }

  @ApiAuth({
    type: UserResDto,
    summary: 'Get current user',
  })
  @SkipThrottle()
  @Get('me')
  async getCurrentUser(
    @CurrentUser('id') userId: AutoIncrementID,
  ): Promise<UserResDto> {
    return await this.userService.findOne(userId);
  }

  @Put('me')
  @ApiAuth({
    type: UserResDto,
    summary: 'Update current user',
  })
  @SkipThrottle()
  async updateMe(
    @CurrentUser('id') userId: AutoIncrementID,
    @Body() reqDto: UpdateAuthUserMeReqDto,
  ): Promise<{ message: string }> {
    await this.userService.update(userId, reqDto as any);
    return { message: 'Profile updated successfully' };
  }

  // --- Two-Factor Authentication ---

  @ApiAuth({
    type: TwoFactorStatusResDto,
    summary: 'Get 2FA status for Client User',
  })
  @SkipPolicies()
  @Get('two-factor/status')
  async twoFactorStatus(
    @CurrentUser() user: any,
  ): Promise<TwoFactorStatusResDto> {
    return await this.twoFactorService.twoFactorStatus(user);
  }

  @ApiAuth({
    type: EnableTwoFactorResDto,
    summary: 'Enable 2FA for Client User',
  })
  @SkipPolicies()
  @Post('two-factor/enable')
  async enableTwoFactor(
    @CurrentUser() user: any,
    @Body() dto: EnableTwoFactorReqDto,
  ): Promise<EnableTwoFactorResDto> {
    return await this.twoFactorService.enableTwoFactor(
      user,
      dto,
      DomainType.CLIENT,
    );
  }

  @ApiAuth({
    type: VerifyTwoFactorSetupResDto,
    summary: 'Verify 2FA setup for Client User',
  })
  @SkipPolicies()
  @Post('two-factor/verify-setup')
  async verifyTwoFactorSetup(
    @CurrentUser() user: any,
    @Body() dto: VerifyTwoFactorSetupReqDto,
  ): Promise<VerifyTwoFactorSetupResDto> {
    return await this.twoFactorService.verifyTwoFactorSetup(
      user,
      dto,
      DomainType.CLIENT,
    );
  }

  @ApiAuth({
    type: DisableTwoFactorResDto,
    summary: 'Disable 2FA for Client User',
  })
  @SkipPolicies()
  @Post('two-factor/disable')
  async disableTwoFactor(
    @CurrentUser() user: any,
    @Body() dto: DisableTwoFactorReqDto,
  ): Promise<DisableTwoFactorResDto> {
    return await this.twoFactorService.disableTwoFactor(
      user,
      dto,
      DomainType.CLIENT,
    );
  }

  @ApiAuth({
    type: GenerateBackupCodesResDto,
    summary: 'Generate 2FA backup codes for Client User',
  })
  @SkipPolicies()
  @Post('two-factor/generate-backup-codes')
  async generateBackupCodes(
    @CurrentUser() user: any,
    @Body() dto: EnableTwoFactorReqDto,
  ): Promise<GenerateBackupCodesResDto> {
    return await this.twoFactorService.generateTwoFactorBackupCodes(
      user,
      dto,
      DomainType.CLIENT,
    );
  }

  @ApiPublic({
    type: LoginResDto,
    summary: 'Verify 2FA Login for Client User',
  })
  @Post('two-factor/verify-login')
  async verifyTwoFactorLogin(
    @Body() dto: VerifyTwoFactorLoginReqDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResDto> {
    const result = await this.twoFactorService.verifyTwoFactorLogin(
      dto,
      DomainType.CLIENT,
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
      domain: DomainType.CLIENT,
    });
    return plainToInstance(LoginResDto, result);
  }

  private getVerificationRedirectUrl(status: 'success' | 'failed') {
    const clientUrl =
      this.getOriginFromUrl(
        this.configService.get<string>('auth.clientResetPasswordUrl'),
      ) || 'http://localhost:3000';
    const url = new URL('/auth/login', clientUrl);

    url.searchParams.set('verification', status);

    return url.toString();
  }

  private getSocialRedirectUrl(status: 'failed') {
    const clientUrl =
      this.configService.get<string>('auth.clientUrl') ||
      'http://localhost:3000';
    const url = new URL('/auth/login', clientUrl);

    url.searchParams.set('social', status);

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
