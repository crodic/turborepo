import { UserChangePasswordReqDto } from '@/api/user/dto/user-change-password.req.dto';
import { UserChangePasswordResDto } from '@/api/user/dto/user-change-password.res.dto';
import { UserResDto } from '@/api/user/dto/user.res.dto';
import { AutoIncrementID } from '@/common/types/common.type';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { SkipPolicies } from '@/decorators/skip-policies.decorator';
import { GoogleOAuthGuard } from '@/guards/google-oauth.guard';
import { UserAuthGuard } from '@/guards/user-auth.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
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
import { LoginReqDto } from '../dto/users/login.req.dto';
import { LoginResDto } from '../dto/users/login.res.dto';
import { RegisterReqDto } from '../dto/users/register.req.dto';
import { SetupInitialPasswordReqDto } from '../dto/users/setup-initial-password.req.dto';
import { SocialAccountResDto } from '../dto/users/social-account.res.dto';
import { SocialExchangeReqDto } from '../dto/users/social-exchange.req.dto';
import { SocialLinkUrlResDto } from '../dto/users/social-link-url.res.dto';
import { UpdateAuthUserMeReqDto } from '../dto/users/update-me.req.dto';
import { ProdOnlyThrottleGuard } from '../guards/ProdOnlyThrottle.guard';
import { UserAuthService } from '../services/user-auth.service';
import { JwtPayloadType } from '../types/jwt-payload.type';

@ApiTags('User Authentication')
@Controller({
  path: 'user/auth',
  version: '1',
})
@UseGuards(UserAuthGuard, ProdOnlyThrottleGuard)
export class UserAuthenticationController {
  constructor(
    private readonly userAuthService: UserAuthService,
    private readonly configService: ConfigService,
  ) {}

  @ApiPublic({
    type: LoginResDto,
    summary: 'Sign-in',
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async signIn(
    @Body() userLoginDto: LoginReqDto,
    @Request() req,
  ): Promise<LoginResDto> {
    return await this.userAuthService.signIn(userLoginDto, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @ApiPublic({
    type: RegisterResDto,
    summary: 'Sign-up',
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  async signUp(@Body() dto: RegisterReqDto): Promise<RegisterResDto> {
    return await this.userAuthService.signUp(dto);
  }

  @ApiPublic({
    type: RefreshResDto,
    summary: 'Refresh token',
  })
  @SkipThrottle()
  @Post('refresh')
  async refresh(@Body() dto: RefreshReqDto): Promise<RefreshResDto> {
    return await this.userAuthService.refreshToken(dto);
  }

  @ApiAuth({
    summary: 'Logout for client',
    errorResponses: [304, 500, 401, 403],
  })
  @SkipThrottle()
  @SkipPolicies()
  @Post('logout')
  async logout(@CurrentUser() userToken: JwtPayloadType): Promise<void> {
    await this.userAuthService.logout(userToken);
  }

  @ApiAuth({
    type: SessionResDto,
    summary: 'List current user sessions',
  })
  @SkipThrottle()
  @Get('sessions')
  async sessions(@CurrentUser() userToken: JwtPayloadType) {
    return this.userAuthService.listSessions(userToken);
  }

  @ApiAuth({ summary: 'Revoke all current user sessions' })
  @SkipThrottle()
  @Delete('sessions')
  async revokeAllSessions(@CurrentUser() userToken: JwtPayloadType) {
    return this.userAuthService.revokeAllSessions(userToken);
  }

  @ApiAuth({ summary: 'Revoke one current user session' })
  @SkipThrottle()
  @Delete('sessions/:id')
  async revokeSession(
    @CurrentUser() userToken: JwtPayloadType,
    @Param('id') sessionId: AutoIncrementID,
  ) {
    return this.userAuthService.revokeSession(userToken, sessionId);
  }

  @ApiAuth({ summary: 'Stop impersonating user' })
  @SkipThrottle()
  @Post('stop-impersonating')
  async stopImpersonating(
    @CurrentUser() userToken: JwtPayloadType,
    @Request() req: any,
  ) {
    return this.userAuthService.stopImpersonating(userToken, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
      method: req.method,
      endpoint: req.originalUrl || req.url,
    });
  }

  @ApiPublic({ type: ForgotPasswordResDto, summary: 'Forgot password' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('forgot-password')
  async forgotPassword(
    @Body() dto: ForgotPasswordReqDto,
  ): Promise<ForgotPasswordResDto> {
    return await this.userAuthService.forgotPassword(dto);
  }

  @ApiPublic({ type: ResetPasswordResDto, summary: 'Reset password' })
  @ApiQuery({ name: 'token', type: 'string' })
  @Post('reset-password')
  async resetPassword(
    @Query('token') token: string,
    @Body() dto: ResetPasswordReqDto,
  ): Promise<ResetPasswordResDto> {
    return await this.userAuthService.resetPassword(token, dto);
  }

  @ApiPublic({ summary: 'Verify email' })
  @ApiQuery({ name: 'token', type: 'string' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('verify/email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    try {
      await this.userAuthService.verifyAccount(token);
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
    return this.userAuthService.resendVerifyEmail(dto);
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
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    try {
      const redirectUrl = await this.userAuthService.handleSocialLoginCallback(
        req.user,
        req.query?.state,
        {
          ipAddress: req.ip,
          userAgent: req.headers?.['user-agent'],
        },
      );

      return res.redirect(redirectUrl);
    } catch {
      return res.redirect(this.getSocialRedirectUrl('failed'));
    }
  }

  @ApiPublic({ type: LoginResDto, summary: 'Exchange social login token' })
  @Post('social/exchange')
  async exchangeSocialLogin(
    @Body() dto: SocialExchangeReqDto,
  ): Promise<LoginResDto> {
    return this.userAuthService.exchangeSocialLogin(dto);
  }

  @ApiPublic({
    type: LoginResDto,
    summary: 'Exchange impersonation login token',
  })
  @Post('impersonation/exchange')
  async exchangeImpersonationLogin(
    @Body() dto: SocialExchangeReqDto,
  ): Promise<LoginResDto> {
    return this.userAuthService.exchangeImpersonationLogin(dto);
  }

  @ApiAuth({
    type: SocialLinkUrlResDto,
    summary: 'Create Google link account URL',
  })
  @SkipThrottle()
  @Post('me/social/google/link')
  async createGoogleLinkUrl(
    @CurrentUser() userToken: JwtPayloadType,
  ): Promise<SocialLinkUrlResDto> {
    return this.userAuthService.createGoogleLinkUrl(userToken);
  }

  @ApiAuth({
    type: SocialAccountResDto,
    summary: 'List linked social accounts',
  })
  @SkipThrottle()
  @Get('me/social-accounts')
  async listSocialAccounts(
    @CurrentUser() userToken: JwtPayloadType,
  ): Promise<SocialAccountResDto[]> {
    return this.userAuthService.listSocialAccounts(userToken);
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
    return this.userAuthService.changePassword(userId, reqDto);
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
    return this.userAuthService.setupInitialPassword(userId, reqDto);
  }

  @ApiAuth({
    type: UserResDto,
    summary: 'Get current user',
  })
  @SkipThrottle()
  @Get('me')
  async getCurrentUser(
    @CurrentUser() userToken: JwtPayloadType,
  ): Promise<UserResDto> {
    return await this.userAuthService.me(userToken);
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
    return await this.userAuthService.updateMe(userId, reqDto);
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
