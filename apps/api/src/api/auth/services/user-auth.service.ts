import { SessionEntity } from '@/api/auth/entities/session.entity';
import { UserSocialAccountEntity } from '@/api/auth/entities/user-social-account.entity';
import { UserChangePasswordReqDto } from '@/api/user/dto/user-change-password.req.dto';
import { UserChangePasswordResDto } from '@/api/user/dto/user-change-password.res.dto';
import { UserResDto } from '@/api/user/dto/user.res.dto';
import { UserEntity } from '@/api/user/entities/user.entity';
import {
  IEmailJob,
  IForgotPasswordEmailJob,
  IVerifyEmailJob,
} from '@/common/interfaces/job.interface';
import { AutoIncrementID } from '@/common/types/common.type';
import { Branded } from '@/common/types/types';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import { EOAuthProvider, ESessionUserType } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { JobName, QueueName } from '@/constants/job.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { createCacheKey } from '@/utils/cache.util';
import { verifyPassword } from '@/utils/password.util';
import { InjectQueue } from '@nestjs/bullmq';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import { assert } from 'console';
import crypto from 'crypto';
import ms, { StringValue } from 'ms';
import { In, IsNull, Repository } from 'typeorm';
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
import { VerifyAccountResDto } from '../dto/verify-account.req.dto';
import { OAuthProviderProfile } from '../social/oauth-provider-profile.type';
import { JwtForgotPasswordPayload } from '../types/jwt-forgot-password-payload';
import { JwtPayloadType } from '../types/jwt-payload.type';
import { JwtRefreshPayloadType } from '../types/jwt-refresh-payload.type';

type Token = Branded<
  {
    accessToken: string;
    refreshToken: string;
    tokenExpires: number;
  },
  'token'
>;

type SessionRequestInfo = {
  ipAddress?: string;
  userAgent?: string | string[];
};

type OAuthStateValue = {
  mode: 'link';
  userId: AutoIncrementID;
};

@Injectable()
export class UserAuthService {
  private readonly logger = new Logger(UserAuthService.name);

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    @InjectRepository(UserSocialAccountEntity)
    private readonly socialAccountRepository: Repository<UserSocialAccountEntity>,
    @InjectQueue(QueueName.EMAIL)
    private readonly emailQueue: Queue<IEmailJob, any, string>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async signIn(
    dto: LoginReqDto,
    requestInfo?: SessionRequestInfo,
  ): Promise<LoginResDto> {
    const { email, password } = dto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    const isPasswordValid =
      user && (await verifyPassword(password, user.password));

    if (!isPasswordValid) {
      throw new BadRequestException({ message: 'Invalid credentials' });
    }

    return this.createLoginResponse(user, requestInfo);
  }

  async signUp(dto: RegisterReqDto): Promise<RegisterResDto> {
    const isExistUser = await UserEntity.exists({
      where: { email: dto.email },
    });

    if (isExistUser) {
      throw new ValidationException(ErrorCode.E003);
    }

    // Register user
    const user = await this.userRepository.save({
      firstName: dto.firstName,
      lastName: dto.lastName || '',
      email: dto.email,
      password: dto.password,
    });

    // Send email verification
    const token = await this.createVerificationToken({ id: user.id });
    const tokenExpiresIn = this.configService.getOrThrow(
      'auth.userConfirmEmailExpires',
      {
        infer: true,
      },
    );
    await this.cacheManager.set(
      createCacheKey(CacheKey.EMAIL_VERIFICATION, user.id),
      token,
      ms(tokenExpiresIn as StringValue),
    );
    await this.emailQueue.add(
      JobName.USER_EMAIL_VERIFICATION,
      {
        email: dto.email,
        token,
      } as IVerifyEmailJob,
      { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    );

    return plainToInstance(RegisterResDto, {
      userId: user.id,
    });
  }

  async verifyAccount(token: string): Promise<VerifyAccountResDto> {
    const { id } = this.verifyEmailToken(token);

    const user = await this.userRepository.findOneBy({ id });

    if (!user) {
      throw new BadRequestException();
    }

    user.verifiedAt = new Date();
    await user.save();

    await this.cacheManager.del(
      createCacheKey(CacheKey.EMAIL_VERIFICATION, id),
    );

    return plainToInstance(VerifyAccountResDto, {
      verified: true,
      message: 'Your account has been verified',
      userId: user.id,
    });
  }

  async resendVerifyEmail(
    dto: ResendEmailVerifyReqDto,
  ): Promise<ResendEmailVerifyResDto> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (user) {
      const token = await this.createVerificationToken({ id: user.id });
      const tokenExpiresIn = this.configService.getOrThrow(
        'auth.userConfirmEmailExpires',
        {
          infer: true,
        },
      );
      await this.cacheManager.set(
        createCacheKey(CacheKey.EMAIL_VERIFICATION, user.id),
        token,
        ms(tokenExpiresIn as StringValue),
      );
      await this.emailQueue.add(
        JobName.USER_EMAIL_VERIFICATION,
        {
          email: dto.email,
          token,
        } as IVerifyEmailJob,
        { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
      );
    }

    return plainToInstance(ResendEmailVerifyResDto, {
      userId: user.id,
    });
  }

  async refreshToken(dto: RefreshReqDto): Promise<RefreshResDto> {
    const { sessionId, hash } = this.verifyRefreshToken(dto.refreshToken);
    const session = await this.sessionRepository.findOneBy({
      id: sessionId,
      userType: ESessionUserType.USER,
      revokedAt: IsNull(),
    });

    if (!session || session.hash !== hash) {
      throw new UnauthorizedException();
    }

    if (session.expiresAt && session.expiresAt <= new Date()) {
      await this.sessionRepository.update(session.id, {
        revokedAt: new Date(),
      });
      throw new UnauthorizedException();
    }

    const user = await this.userRepository.findOneOrFail({
      where: { id: session.userId },
      select: ['id'],
    });

    const newHash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    await this.sessionRepository.update(
      {
        id: session.id,
        hash,
        userType: ESessionUserType.USER,
        revokedAt: IsNull(),
      },
      { hash: newHash },
    );

    return await this.createToken({
      id: user.id,
      sessionId: session.id,
      hash: newHash,
    });
  }

  async forgotPassword(
    dto: ForgotPasswordReqDto,
  ): Promise<ForgotPasswordResDto> {
    const user = await this.userRepository.findOneOrFail({
      where: { email: dto.email },
    });

    if (!user) {
      throw new ValidationException(ErrorCode.E004);
    }

    const token = await this.createForgotToken({ id: user.id });
    const tokenExpiresIn = this.configService.getOrThrow(
      'auth.userForgotExpires',
      {
        infer: true,
      },
    );

    await this.cacheManager.set(
      createCacheKey(CacheKey.FORGOT_PASSWORD, user.id),
      token,
      ms(tokenExpiresIn as StringValue),
    );

    await this.emailQueue.add(
      JobName.USER_EMAIL_FORGOT_PASSWORD,
      {
        email: dto.email,
        token,
      } as IForgotPasswordEmailJob,
      { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    );

    const clientResetPasswordUrl = this.configService.getOrThrow(
      'auth.clientResetPasswordUrl',
      {
        infer: true,
      },
    );

    return plainToInstance(ForgotPasswordResDto, {
      redirect: `${clientResetPasswordUrl}?token=${token}`,
    });
  }

  async resetPassword(
    token: string,
    dto: ResetPasswordReqDto,
  ): Promise<ResetPasswordResDto> {
    const { id } = this.verifyForgotPasswordToken(token);

    const user = await this.userRepository.findOneBy({ id });

    if (!user) {
      throw new BadRequestException();
    }

    await this.cacheManager.del(createCacheKey(CacheKey.FORGOT_PASSWORD, id));

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException();
    }

    user.password = dto.password;

    await user.save();

    return plainToInstance(ResetPasswordResDto, {
      success: true,
      message: 'Reset password successfully. Please login to continue website',
    });
  }

  async exchangeSocialLogin(dto: SocialExchangeReqDto): Promise<LoginResDto> {
    const cacheKey = createCacheKey(CacheKey.SOCIAL_OAUTH_EXCHANGE, dto.token);
    const cached = await this.cacheManager.get<LoginResDto>(cacheKey);

    if (!cached) {
      throw new UnauthorizedException();
    }

    await this.cacheManager.del(cacheKey);

    return plainToInstance(LoginResDto, cached);
  }

  async exchangeImpersonationLogin(
    dto: SocialExchangeReqDto,
  ): Promise<LoginResDto> {
    const cacheKey = createCacheKey(CacheKey.IMPERSONATION_EXCHANGE, dto.token);
    const cached = await this.cacheManager.get<LoginResDto>(cacheKey);

    if (!cached) {
      throw new UnauthorizedException();
    }

    await this.cacheManager.del(cacheKey);

    return plainToInstance(LoginResDto, cached);
  }

  async createGoogleLinkUrl(
    userToken: JwtPayloadType,
  ): Promise<SocialLinkUrlResDto> {
    const state = crypto.randomUUID();

    await this.cacheManager.set<OAuthStateValue>(
      createCacheKey(CacheKey.SOCIAL_OAUTH_STATE, state),
      {
        mode: 'link',
        userId: userToken.id as AutoIncrementID,
      },
      ms('10m'),
    );

    const url = new URL(
      '/api/v1/user/auth/social/google',
      this.configService.getOrThrow('app.url', { infer: true }),
    );
    url.searchParams.set('state', state);

    return plainToInstance(SocialLinkUrlResDto, { url: url.toString() });
  }

  async handleSocialLoginCallback(
    profile: OAuthProviderProfile,
    state?: string,
    requestInfo?: SessionRequestInfo,
  ): Promise<string> {
    if (!profile.email || !profile.providerAccountId) {
      throw new BadRequestException('Social account profile is incomplete');
    }

    const oauthState = state ? await this.consumeOAuthState(state) : undefined;

    if (oauthState?.mode === 'link') {
      await this.linkSocialAccount(oauthState.userId, profile);
      return this.buildClientRedirectUrl('/client-profile', {
        social: 'linked',
      });
    }

    const loginResponse = await this.signInOrRegisterSocialUser(
      profile,
      requestInfo,
    );
    const exchangeToken = await this.createOAuthExchangeToken(loginResponse);

    return this.buildClientRedirectUrl('/auth/oauth/callback', {
      token: exchangeToken,
    });
  }

  async listSocialAccounts(
    userToken: JwtPayloadType,
  ): Promise<SocialAccountResDto[]> {
    const accounts = await this.socialAccountRepository.find({
      where: { userId: userToken.id as AutoIncrementID },
      order: { createdAt: 'DESC' },
    });

    return plainToInstance(SocialAccountResDto, accounts, {
      excludeExtraneousValues: true,
    });
  }

  async setupInitialPassword(
    userId: AutoIncrementID,
    dto: SetupInitialPasswordReqDto,
  ): Promise<UserChangePasswordResDto> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.userRepository.findOneByOrFail({ id: userId });

    if (user.password) {
      throw new BadRequestException('Password has already been configured');
    }

    user.password = dto.password;
    await this.userRepository.save(user);

    return plainToInstance(UserChangePasswordResDto, {
      message: 'Password configured successfully',
      user: plainToInstance(
        UserResDto,
        { ...user, hasPassword: true },
        { excludeExtraneousValues: true },
      ),
    });
  }

  async verifyAccessToken(token: string): Promise<JwtPayloadType> {
    let payload: JwtPayloadType;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.userSecret', {
          infer: true,
        }),
      });
    } catch {
      throw new UnauthorizedException();
    }

    // Force logout if the session is in the blacklist
    const isSessionBlacklisted = await this.cacheManager.get<boolean>(
      createCacheKey(CacheKey.SESSION_BLACKLIST, payload.sessionId),
    );

    if (isSessionBlacklisted) {
      throw new UnauthorizedException();
    }

    const session = await this.sessionRepository.findOneBy({
      id: payload.sessionId as AutoIncrementID,
      userId: payload.id as AutoIncrementID,
      userType: ESessionUserType.USER,
    });

    if (
      !session ||
      !payload.hash ||
      session.hash !== payload.hash ||
      session.revokedAt ||
      (session.expiresAt && session.expiresAt <= new Date())
    ) {
      throw new UnauthorizedException();
    }

    return payload;
  }

  async logout(userToken: JwtPayloadType): Promise<void> {
    await this.revokeCurrentSession(userToken);
  }

  async listSessions(userToken: JwtPayloadType): Promise<SessionResDto[]> {
    const sessions = await this.sessionRepository.find({
      where: {
        userId: userToken.id as AutoIncrementID,
        userType: ESessionUserType.USER,
        revokedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });

    return plainToInstance(SessionResDto, sessions, {
      excludeExtraneousValues: true,
    });
  }

  async revokeSession(
    userToken: JwtPayloadType,
    sessionId: AutoIncrementID,
  ): Promise<{ message: string }> {
    const result = await this.sessionRepository.update(
      {
        id: sessionId,
        userId: userToken.id as AutoIncrementID,
        userType: ESessionUserType.USER,
        revokedAt: IsNull(),
      },
      { revokedAt: new Date() },
    );

    if (result.affected === 0) {
      throw new NotFoundException('Session not found');
    }

    await this.blacklistSession(sessionId);

    return { message: 'Session revoked successfully' };
  }

  async revokeAllSessions(
    userToken: JwtPayloadType,
  ): Promise<{ message: string }> {
    const sessions = await this.sessionRepository.find({
      where: {
        userId: userToken.id as AutoIncrementID,
        userType: ESessionUserType.USER,
        revokedAt: IsNull(),
      },
      select: ['id'],
    });

    if (sessions.length > 0) {
      await this.sessionRepository.update(
        {
          id: In(sessions.map((session) => session.id)),
          userId: userToken.id as AutoIncrementID,
          userType: ESessionUserType.USER,
          revokedAt: IsNull(),
        },
        { revokedAt: new Date() },
      );

      await Promise.all(
        sessions.map((session) => this.blacklistSession(session.id)),
      );
    }

    return { message: 'Sessions revoked successfully' };
  }

  async stopImpersonating(
    userToken: JwtPayloadType,
  ): Promise<{ message: string }> {
    const session = await this.sessionRepository.findOneBy({
      id: userToken.sessionId as AutoIncrementID,
      userId: userToken.id as AutoIncrementID,
      userType: ESessionUserType.USER,
      revokedAt: IsNull(),
    });

    if (!session?.impersonatedBy) {
      throw new BadRequestException('Current session is not impersonated');
    }

    const result = await this.sessionRepository.update(
      {
        id: userToken.sessionId as AutoIncrementID,
        userId: userToken.id as AutoIncrementID,
        userType: ESessionUserType.USER,
        revokedAt: IsNull(),
      },
      { revokedAt: new Date() },
    );

    if (result.affected === 0) {
      throw new BadRequestException('Current session is not impersonated');
    }

    await this.blacklistSession(userToken.sessionId);

    return { message: 'Stopped impersonating successfully' };
  }

  private async revokeCurrentSession(userToken: JwtPayloadType) {
    await this.blacklistSession(userToken.sessionId as AutoIncrementID);
    await this.sessionRepository.update(
      {
        id: userToken.sessionId as AutoIncrementID,
        userId: userToken.id as AutoIncrementID,
        userType: ESessionUserType.USER,
        revokedAt: IsNull(),
      },
      { revokedAt: new Date() },
    );
  }

  private async blacklistSession(sessionId: AutoIncrementID | string) {
    const refreshExpires = this.configService.getOrThrow(
      'auth.userRefreshExpires',
      {
        infer: true,
      },
    );

    await this.cacheManager.set<boolean>(
      createCacheKey(CacheKey.SESSION_BLACKLIST, sessionId),
      true,
      ms(refreshExpires as StringValue),
    );
  }

  private async clearSessionBlacklist(sessionId: AutoIncrementID | string) {
    await this.cacheManager.del(
      createCacheKey(CacheKey.SESSION_BLACKLIST, sessionId),
    );
  }

  private verifyRefreshToken(token: string): JwtRefreshPayloadType {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.userRefreshSecret', {
          infer: true,
        }),
      });
    } catch {
      throw new UnauthorizedException();
    }
  }

  private async createVerificationToken(data: { id: string }): Promise<string> {
    return await this.jwtService.signAsync(
      {
        id: data.id,
      },
      {
        secret: this.configService.getOrThrow('auth.userConfirmEmailSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow(
          'auth.userConfirmEmailExpires',
          {
            infer: true,
          },
        ),
      },
    );
  }

  private async createForgotToken(data: { id: string }): Promise<string> {
    return await this.jwtService.signAsync(
      {
        id: data.id,
      },
      {
        secret: this.configService.getOrThrow('auth.userForgotSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow('auth.userForgotExpires', {
          infer: true,
        }),
      },
    );
  }

  private async createToken(data: {
    id: string;
    sessionId: string;
    hash: string;
  }): Promise<Token> {
    const tokenExpiresIn = this.configService.getOrThrow('auth.userExpires', {
      infer: true,
    });
    const tokenExpires = Date.now() + ms(tokenExpiresIn as StringValue);

    const [accessToken, refreshToken] = await Promise.all([
      await this.jwtService.signAsync(
        {
          id: data.id,
          sessionId: data.sessionId,
          hash: data.hash,
        },
        {
          secret: this.configService.getOrThrow('auth.userSecret', {
            infer: true,
          }),
          expiresIn: tokenExpiresIn as StringValue,
        },
      ),
      await this.jwtService.signAsync(
        {
          sessionId: data.sessionId,
          hash: data.hash,
        },
        {
          secret: this.configService.getOrThrow('auth.userRefreshSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.userRefreshExpires', {
            infer: true,
          }),
        },
      ),
    ]);
    return {
      accessToken,
      refreshToken,
      tokenExpires,
    } as Token;
  }

  private verifyEmailToken(token: string): JwtForgotPasswordPayload {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.userConfirmEmailSecret', {
          infer: true,
        }),
      });
    } catch {
      throw new HttpException('URL không còn khả dụng', HttpStatus.GONE);
    }
  }

  private verifyForgotPasswordToken(token: string): JwtForgotPasswordPayload {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.userForgotSecret', {
          infer: true,
        }),
      });
    } catch {
      throw new HttpException('URL không còn khả dụng', HttpStatus.GONE);
    }
  }

  async me(userToken: JwtPayloadType): Promise<UserResDto> {
    assert(userToken.id, 'id is required');
    const user = await this.userRepository.findOneBy({
      id: userToken.id as AutoIncrementID,
    });

    if (!user) {
      throw new ForbiddenException('Forbidden');
    }

    return plainToInstance(
      UserResDto,
      {
        ...user,
        hasPassword: !!user.password,
        isImpersonating: !!userToken.impersonatedBy,
        impersonatedBy: userToken.impersonatedBy,
        impersonationExpiresAt: userToken.impersonationExpiresAt,
      },
      { excludeExtraneousValues: true },
    );
  }

  async changePassword(
    id: AutoIncrementID,
    dto: UserChangePasswordReqDto,
  ): Promise<UserChangePasswordResDto> {
    const user = await this.userRepository.findOneByOrFail({ id });
    const isPasswordValid = await verifyPassword(dto.password, user.password);
    if (!isPasswordValid) {
      throw new ValidationException(ErrorCode.E002);
    }
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new ValidationException(ErrorCode.E003);
    }
    user.password = dto.newPassword;

    await this.userRepository.save(user);

    return plainToInstance(UserChangePasswordResDto, {
      message: 'Change password successfully',
      user: plainToInstance(
        UserResDto,
        { ...user, hasPassword: true },
        { excludeExtraneousValues: true },
      ),
    });
  }

  async updateMe(
    id: AutoIncrementID,
    dto: UpdateAuthUserMeReqDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, {
      ...dto,
      updatedBy: id,
    });

    await this.userRepository.save(user);

    return {
      message: 'success',
    };
  }

  private async createLoginResponse(
    user: UserEntity,
    requestInfo?: SessionRequestInfo,
  ): Promise<LoginResDto> {
    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = new SessionEntity({
      hash,
      userId: user.id,
      userType: ESessionUserType.USER,
      ipAddress: requestInfo?.ipAddress,
      userAgent: normalizeUserAgent(requestInfo?.userAgent),
    });
    await this.sessionRepository.save(session);
    await this.clearSessionBlacklist(session.id);

    const token = await this.createToken({
      id: user.id,
      sessionId: session.id,
      hash,
    });

    return plainToInstance(LoginResDto, {
      userId: user.id,
      ...token,
    });
  }

  private async consumeOAuthState(state: string): Promise<OAuthStateValue> {
    const cacheKey = createCacheKey(CacheKey.SOCIAL_OAUTH_STATE, state);
    const value = await this.cacheManager.get<OAuthStateValue>(cacheKey);

    if (!value) {
      throw new BadRequestException('Invalid or expired OAuth state');
    }

    await this.cacheManager.del(cacheKey);

    return value;
  }

  private async createOAuthExchangeToken(loginResponse: LoginResDto) {
    const exchangeToken = crypto.randomUUID();
    await this.cacheManager.set<LoginResDto>(
      createCacheKey(CacheKey.SOCIAL_OAUTH_EXCHANGE, exchangeToken),
      loginResponse,
      ms('5m'),
    );

    return exchangeToken;
  }

  private async signInOrRegisterSocialUser(
    profile: OAuthProviderProfile,
    requestInfo?: SessionRequestInfo,
  ): Promise<LoginResDto> {
    const existingAccount = await this.socialAccountRepository.findOne({
      where: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    });

    if (existingAccount) {
      const user = await this.userRepository.findOneByOrFail({
        id: existingAccount.userId,
      });

      return this.createLoginResponse(user, requestInfo);
    }

    if (!profile.emailVerified) {
      throw new BadRequestException('Google email must be verified');
    }

    let user = await this.userRepository.findOne({
      where: { email: profile.email },
    });

    if (!user) {
      user = await this.userRepository.save({
        firstName: profile.firstName || profile.displayName || 'User',
        lastName: profile.lastName || '',
        email: profile.email,
        avatar: profile.avatarUrl,
        verifiedAt: new Date(),
      });
    } else if (!user.verifiedAt) {
      user.verifiedAt = new Date();
      await this.userRepository.save(user);
    }

    await this.createSocialAccount(user.id, profile);

    return this.createLoginResponse(user, requestInfo);
  }

  private async linkSocialAccount(
    userId: AutoIncrementID,
    profile: OAuthProviderProfile,
  ): Promise<void> {
    if (!profile.emailVerified) {
      throw new BadRequestException('Google email must be verified');
    }

    const user = await this.userRepository.findOneByOrFail({ id: userId });

    if (normalizeEmail(user.email) !== normalizeEmail(profile.email)) {
      throw new BadRequestException(
        'Google account email must match your account email',
      );
    }

    const providerAccount = await this.socialAccountRepository.findOne({
      where: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    });

    if (providerAccount && providerAccount.userId !== user.id) {
      throw new BadRequestException(
        'This Google account is already linked to another user',
      );
    }

    const existingUserProvider = await this.socialAccountRepository.findOne({
      where: {
        userId: user.id,
        provider: profile.provider,
      },
    });

    if (
      existingUserProvider &&
      existingUserProvider.providerAccountId !== profile.providerAccountId
    ) {
      throw new BadRequestException('A Google account is already linked');
    }

    if (!existingUserProvider) {
      await this.createSocialAccount(user.id, profile);
    }
  }

  private async createSocialAccount(
    userId: AutoIncrementID,
    profile: OAuthProviderProfile,
  ) {
    return this.socialAccountRepository.save(
      new UserSocialAccountEntity({
        userId,
        provider: profile.provider || EOAuthProvider.GOOGLE,
        providerAccountId: profile.providerAccountId,
        email: profile.email,
        emailVerified: profile.emailVerified,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      }),
    );
  }

  private buildClientRedirectUrl(
    pathname: string,
    query: Record<string, string>,
  ) {
    const url = new URL(
      pathname,
      this.configService.getOrThrow('auth.clientUrl', { infer: true }),
    );

    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    return url.toString();
  }
}

function normalizeUserAgent(userAgent?: string | string[]) {
  return Array.isArray(userAgent) ? userAgent.join(', ') : userAgent;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
