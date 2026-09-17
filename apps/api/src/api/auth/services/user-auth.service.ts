import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { SessionEntity } from '@/api/auth/entities/session.entity';
import { UserChangePasswordResDto } from '@/api/user/dto/user-change-password.res.dto';
import { UserResDto } from '@/api/user/dto/user.res.dto';
import { UserAccountEntity } from '@/api/user/entities/user-account.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { IEmailJob } from '@/common/interfaces/job.interface';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { EAccountProvider, ESessionUserType } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { QueueName } from '@/constants/job.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { InjectQueue } from '@nestjs/bullmq';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import { assert } from 'console';
import { Repository } from 'typeorm';
import { ChangePasswordReqDto } from '../dto/change-password.req.dto';
import { RegisterResDto } from '../dto/register.res.dto';
import { SetupInitialPasswordReqDto } from '../dto/users/setup-initial-password.req.dto';
import { SocialAccountResDto } from '../dto/users/social-account.res.dto';
import { SocialExchangeReqDto } from '../dto/users/social-exchange.req.dto';
import { SocialLinkUrlResDto } from '../dto/users/social-link-url.res.dto';
import { UpdateAuthUserMeReqDto } from '../dto/users/update-me.req.dto';
import { UserLoginReqDto } from '../dto/users/user-login.req.dto';
import { UserLoginResDto } from '../dto/users/user-login.res.dto';
import { UserRegisterReqDto } from '../dto/users/user-register.req.dto';
import { OAuthProviderProfile } from '../social/oauth-provider-profile.type';
import { JwtPayloadType } from '../types/jwt-payload.type';
import { SessionRequestInfo } from '../types/session-request-info.type';
import { AuthSessionService } from './auth-session.service';
import { AuthTokenService, TokenSigningConfig } from './auth-token.service';
import { AuthConfig, AuthService } from './auth.service';
import { SocialAuthService } from './social-auth.service';
import { UserAccountRecoveryService } from './user-account-recovery.service';

@Injectable()
export class UserAuthService extends AuthService<
  UserEntity,
  UserAccountEntity
> {
  private readonly logger = new Logger(UserAuthService.name);

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    authTokenService: AuthTokenService,
    private readonly socialAuthService: SocialAuthService,
    authSessionService: AuthSessionService,
    private readonly userAccountRecoveryService: UserAccountRecoveryService,
    @InjectRepository(UserEntity)
    userRepository: Repository<UserEntity>,
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(SessionEntity)
    sessionRepository: Repository<SessionEntity>,
    @InjectRepository(UserAccountEntity)
    private readonly userAccountRepository: Repository<UserAccountEntity>,
    @InjectQueue(QueueName.EMAIL)
    private readonly emailQueue: Queue<IEmailJob, any, string>,
    @Inject(CACHE_MANAGER)
    cacheManager: Cache,
  ) {
    super(
      userRepository,
      sessionRepository,
      authTokenService,
      authSessionService,
      cacheManager,
    );
  }

  protected getAuthConfig(): AuthConfig {
    return {
      userType: ESessionUserType.USER,
      tokenConfig: this.getTokenConfig(),
    };
  }

  protected findLocalAccount(
    userId: AutoIncrementID,
  ): Promise<UserAccountEntity | null> {
    return this.userAccountRepository.findOne({
      where: {
        userId,
        provider: EAccountProvider.LOCAL,
      },
    });
  }

  protected async saveLocalAccountPassword(
    user: UserEntity,
    newPassword: string,
  ): Promise<UserAccountEntity> {
    let localAccount = await this.findLocalAccount(user.id);

    if (!localAccount) {
      localAccount = new UserAccountEntity({
        userId: user.id,
        provider: EAccountProvider.LOCAL,
        providerAccountId: user.email,
        password: newPassword,
        email: user.email,
        displayName: `${user.firstName} ${user.lastName || ''}`.trim(),
      });
    } else {
      localAccount.password = newPassword;
    }

    return this.userAccountRepository.save(localAccount);
  }

  private getTokenConfig(): TokenSigningConfig {
    return {
      secret: this.configService.getOrThrow('auth.userSecret', { infer: true }),
      expiresIn: this.configService.getOrThrow('auth.userExpires', {
        infer: true,
      }),
      refreshSecret: this.configService.getOrThrow('auth.userRefreshSecret', {
        infer: true,
      }),
      refreshExpiresIn: this.configService.getOrThrow(
        'auth.userRefreshExpires',
        { infer: true },
      ),
    };
  }

  async signIn(
    dto: UserLoginReqDto,
    requestInfo?: SessionRequestInfo,
  ): Promise<UserLoginResDto> {
    const { email, password } = dto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException({ message: 'Invalid credentials' });
    }

    const { isValid } = await this.verifyLocalPassword(user.id, password);

    if (!isValid) {
      throw new BadRequestException({ message: 'Invalid credentials' });
    }

    return this.createLoginResponse(user, requestInfo);
  }

  async signUp(dto: UserRegisterReqDto): Promise<RegisterResDto> {
    const isExistUser = await UserEntity.exists({
      where: { email: dto.email },
    });

    if (isExistUser) {
      throw new ValidationException(ErrorCode.E003);
    }

    // Register user
    const newUser = this.userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName || '',
      email: dto.email,
    });
    const user = await this.userRepository.save(newUser);

    // Create local credentials account
    await this.userAccountRepository.save(
      new UserAccountEntity({
        userId: user.id,
        provider: EAccountProvider.LOCAL,
        providerAccountId: user.email,
        password: dto.password,
        email: user.email,
        displayName: `${user.firstName} ${user.lastName || ''}`.trim(),
      }),
    );

    // Send email verification
    await this.userAccountRecoveryService.sendVerificationEmail(user);

    return plainToInstance(RegisterResDto, {
      userId: user.id,
    });
  }

  async exchangeSocialLogin(
    dto: SocialExchangeReqDto,
  ): Promise<UserLoginResDto> {
    const cached = await this.socialAuthService.consumeExchangeToken(dto.token);
    return plainToInstance(UserLoginResDto, cached);
  }

  async createGoogleLinkUrl(
    userToken: JwtPayloadType,
  ): Promise<SocialLinkUrlResDto> {
    const state = await this.socialAuthService.createOAuthState(
      userToken.id as AutoIncrementID,
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

    const oauthState = state
      ? await this.socialAuthService.consumeOAuthState(state)
      : undefined;

    if (oauthState?.mode === 'link') {
      await this.linkSocialAccount(oauthState.userId, profile);
      return this.socialAuthService.buildClientRedirectUrl('/profile', {
        social: 'linked',
      });
    }

    const loginResponse = await this.signInOrRegisterSocialUser(
      profile,
      requestInfo,
    );
    const exchangeToken =
      await this.socialAuthService.createExchangeToken(loginResponse);

    return this.socialAuthService.buildClientRedirectUrl(
      '/auth/oauth/callback',
      {
        token: exchangeToken,
      },
    );
  }

  async listSocialAccounts(
    userToken: JwtPayloadType,
  ): Promise<SocialAccountResDto[]> {
    const accounts = await this.userAccountRepository.find({
      where: {
        userId: userToken.id as AutoIncrementID,
      },
      order: {
        createdAt: 'DESC',
      },
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

    let localAccount = await this.findLocalAccount(user.id);

    if (localAccount?.password) {
      throw new BadRequestException(
        'Account already has a password configured. Use change password instead.',
      );
    }

    if (!localAccount) {
      localAccount = new UserAccountEntity({
        userId: user.id,
        provider: EAccountProvider.LOCAL,
        providerAccountId: user.email,
        password: dto.password,
        email: user.email,
        displayName: `${user.firstName} ${user.lastName || ''}`.trim(),
      });
    } else {
      localAccount.password = dto.password;
    }

    await this.userAccountRepository.save(localAccount);

    return plainToInstance(UserChangePasswordResDto, {
      message: 'Password configured successfully',
      user: plainToInstance(
        UserResDto,
        { ...user, hasPassword: true },
        { excludeExtraneousValues: true },
      ),
    });
  }

  async me(userToken: JwtPayloadType): Promise<UserResDto> {
    assert(userToken.id, 'id is required');
    const user = await this.userRepository.findOneBy({
      id: userToken.id as AutoIncrementID,
    });

    if (!user) {
      throw new ForbiddenException('Forbidden');
    }

    const localAccount = await this.findLocalAccount(user.id);

    return plainToInstance(
      UserResDto,
      {
        ...user,
        hasPassword: !!localAccount?.password,
      },
      { excludeExtraneousValues: true },
    );
  }

  async changePassword(
    id: AutoIncrementID,
    dto: ChangePasswordReqDto,
  ): Promise<UserChangePasswordResDto> {
    const user = await this.userRepository.findOneByOrFail({ id });
    const { isValid } = await this.verifyLocalPassword(user.id, dto.password);

    if (!isValid) {
      throw new ValidationException(ErrorCode.E002);
    }
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new ValidationException(ErrorCode.E003);
    }

    await this.saveLocalAccountPassword(user, dto.newPassword);

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

    user.firstName = dto.firstName;
    user.lastName = dto.lastName;

    await this.userRepository.save(user);

    return { message: 'Profile updated successfully' };
  }

  private async createLoginResponse(
    user: UserEntity,
    requestInfo?: SessionRequestInfo,
  ): Promise<UserLoginResDto> {
    const { tokens } = await this.createLoginSessionAndTokens(
      user.id,
      requestInfo,
    );

    return plainToInstance(UserLoginResDto, {
      userId: user.id,
      ...tokens,
    });
  }

  private async signInOrRegisterSocialUser(
    profile: OAuthProviderProfile,
    requestInfo?: SessionRequestInfo,
  ): Promise<UserLoginResDto> {
    const existingAccount = await this.userAccountRepository.findOne({
      where: {
        provider:
          (profile.provider as unknown as EAccountProvider) ||
          EAccountProvider.GOOGLE,
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
    userId: AutoIncrementID | string,
    profile: OAuthProviderProfile,
  ): Promise<void> {
    if (!profile.emailVerified) {
      throw new BadRequestException('Google email must be verified');
    }

    const user = await this.userRepository.findOneByOrFail({
      id: userId as AutoIncrementID,
    });

    if (normalizeEmail(user.email) !== normalizeEmail(profile.email)) {
      throw new BadRequestException(
        'Google account email must match your account email',
      );
    }

    const provider =
      (profile.provider as unknown as EAccountProvider) ||
      EAccountProvider.GOOGLE;

    const providerAccount = await this.userAccountRepository.findOne({
      where: {
        provider,
        providerAccountId: profile.providerAccountId,
      },
    });

    if (providerAccount && providerAccount.userId !== user.id) {
      throw new BadRequestException(
        'This Google account is already linked to another user',
      );
    }

    const existingUserProvider = await this.userAccountRepository.findOne({
      where: {
        userId: user.id,
        provider,
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
    userId: AutoIncrementID | string,
    profile: OAuthProviderProfile,
  ) {
    return this.userAccountRepository.save(
      new UserAccountEntity({
        userId: userId as AutoIncrementID,
        provider:
          (profile.provider as unknown as EAccountProvider) ||
          EAccountProvider.GOOGLE,
        providerAccountId: profile.providerAccountId,
        email: profile.email,
        emailVerified: profile.emailVerified,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      }),
    );
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
