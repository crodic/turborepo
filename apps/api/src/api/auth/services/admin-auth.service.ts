import { AdminUserResDto } from '@/api/admin-user/dto/admin-user.res.dto';
import { ChangePasswordResDto } from '@/api/admin-user/dto/change-password.res.dto';
import { UpdateMeReqDto } from '@/api/admin-user/dto/update-me.req.dto';
import { AdminAccountEntity } from '@/api/admin-user/entities/admin-account.entity';
import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { SessionEntity } from '@/api/auth/entities/session.entity';
import {
  AdminNotificationType,
  NotificationService,
} from '@/api/notification/notification.service';
import { RoleEntity } from '@/api/role/entities/role.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import {
  IAdminAccountDeletionRequestedEmailJob,
  IEmailJob,
} from '@/common/interfaces/job.interface';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import {
  ACCOUNT_RESTORE_GRACE_PERIOD_DAYS,
  ACCOUNT_RESTORE_GRACE_PERIOD_MS,
} from '@/constants/app.constant';
import { EAccountProvider, ESessionUserType } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { JobName, QueueName } from '@/constants/job.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { FilesystemService } from '@/filesystem/filesystem.service';
import { InjectQueue } from '@nestjs/bullmq';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import assert from 'assert';
import { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import { In, Repository } from 'typeorm';
import { AdminUserLoginReqDto } from '../dto/admin-users/admin-user-login.req.dto';
import { AdminUserLoginResDto } from '../dto/admin-users/admin-user-login.res.dto';
import { AdminUserRegisterReqDto } from '../dto/admin-users/admin-user-register.req.dto';
import { RestoreAccountReqDto } from '../dto/admin-users/restore-account.req.dto';
import { ChangePasswordReqDto } from '../dto/change-password.req.dto';
import { RegisterResDto } from '../dto/register.res.dto';
import { JwtPayloadType } from '../types/jwt-payload.type';
import { SessionRequestInfo } from '../types/session-request-info.type';
import { AdminAccountRecoveryService } from './admin-account-recovery.service';
import {
  AdminTwoFactorService,
  TWO_FACTOR_ISSUER,
  TWO_FACTOR_SETUP_TTL,
  TwoFactorLoginPayload,
  TwoFactorSetupPayload,
} from './admin-two-factor.service';
import { AuthSessionService } from './auth-session.service';
import { AuthTokenService, TokenSigningConfig } from './auth-token.service';
import { AuthConfig, AuthService } from './auth.service';

export { TWO_FACTOR_ISSUER, TWO_FACTOR_SETUP_TTL };
export type {
  SessionRequestInfo,
  TwoFactorLoginPayload,
  TwoFactorSetupPayload,
};

@Injectable()
export class AdminAuthService extends AuthService<
  AdminUserEntity,
  AdminAccountEntity
> {
  private readonly logger = new Logger(AdminAuthService.name);

  protected get adminUserRepository(): Repository<AdminUserEntity> {
    return this.userRepository;
  }

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    private readonly filesystemService: FilesystemService,
    authTokenService: AuthTokenService,
    @InjectRepository(AdminUserEntity)
    adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(AdminAccountEntity)
    private readonly adminAccountRepository: Repository<AdminAccountEntity>,
    @InjectRepository(SessionEntity)
    sessionRepository: Repository<SessionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectQueue(QueueName.EMAIL)
    private readonly emailQueue: Queue<IEmailJob, any, string>,
    @Inject(CACHE_MANAGER)
    cacheManager: Cache,
    private readonly notificationService: NotificationService,
    authSessionService: AuthSessionService,
    private readonly adminTwoFactorService: AdminTwoFactorService,
    private readonly adminAccountRecoveryService: AdminAccountRecoveryService,
  ) {
    super(
      adminUserRepository,
      sessionRepository,
      authTokenService,
      authSessionService,
      cacheManager,
    );
  }

  protected getAuthConfig(): AuthConfig {
    return {
      userType: ESessionUserType.ADMIN,
      tokenConfig: this.getTokenConfig(),
    };
  }

  protected findLocalAccount(
    userId: AutoIncrementID,
  ): Promise<AdminAccountEntity | null> {
    return this.adminAccountRepository.findOne({
      where: {
        adminUserId: userId,
        provider: EAccountProvider.LOCAL,
      },
    });
  }

  protected async saveLocalAccountPassword(
    user: AdminUserEntity,
    newPassword: string,
  ): Promise<AdminAccountEntity> {
    let localAccount = await this.findLocalAccount(user.id);

    if (!localAccount) {
      localAccount = new AdminAccountEntity({
        adminUserId: user.id,
        provider: EAccountProvider.LOCAL,
        providerAccountId: user.email,
        password: newPassword,
      });
    } else {
      localAccount.password = newPassword;
    }

    return this.adminAccountRepository.save(localAccount);
  }

  private getTokenConfig(): TokenSigningConfig {
    return {
      secret: this.configService.getOrThrow('auth.secret', { infer: true }),
      expiresIn: this.configService.getOrThrow('auth.expires', { infer: true }),
      refreshSecret: this.configService.getOrThrow('auth.refreshSecret', {
        infer: true,
      }),
      refreshExpiresIn: this.configService.getOrThrow('auth.refreshExpires', {
        infer: true,
      }),
    };
  }

  /**
   * Validates admin login credentials against the database.
   * Throws BadRequestException for invalid credentials or ForbiddenException for unverified emails.
   */
  private async validateCredentials(
    email: string,
    password: string,
  ): Promise<AdminUserEntity> {
    const user = await this.adminUserRepository.findOne({
      where: { email },
      withDeleted: true,
    });

    if (!user) {
      throw new BadRequestException({ message: 'Invalid credentials' });
    }

    const { isValid } = await this.verifyLocalPassword(user.id, password);
    if (!isValid) {
      throw new BadRequestException({ message: 'Invalid credentials' });
    }

    if (!user.verifiedAt) {
      throw new ForbiddenException({
        message: 'Please verify your email before logging in',
        code: 'UNVERIFIED_EMAIL',
      });
    }

    return user;
  }

  /**
   * Business Rule: Handles soft-deleted accounts.
   * Soft-deleted accounts have a 30-day grace period where they can be restored.
   * After 30 days, credentials are permanently rejected.
   */
  private async handleDeletedAccount(
    user: AdminUserEntity,
  ): Promise<AdminUserLoginResDto> {
    if (!user.deletedAt) {
      throw new BadRequestException({ message: 'Account is not deleted' });
    }

    const isExpired =
      Date.now() - user.deletedAt.getTime() > ACCOUNT_RESTORE_GRACE_PERIOD_MS;
    if (isExpired) {
      throw new BadRequestException({ message: 'Invalid credentials' });
    }

    const restoreToken = await this.jwtService.signAsync(
      { id: user.id, purpose: 'admin-restore-account' },
      {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
        expiresIn: '5m',
      },
    );

    return plainToInstance(AdminUserLoginResDto, {
      userId: user.id,
      restoreAccountRequired: true,
      restoreToken,
    });
  }

  /**
   * Handles login when Two-Factor Authentication (2FA) is enabled for the account.
   * Returns a temporary twoFactorToken for the client to proceed with 2FA verification.
   */
  private async handleTwoFactorLogin(
    user: AdminUserEntity,
  ): Promise<AdminUserLoginResDto> {
    const twoFactorToken =
      await this.adminTwoFactorService.createTwoFactorLoginToken({
        id: user.id,
        purpose: 'admin-2fa-login',
      });

    return plainToInstance(AdminUserLoginResDto, {
      userId: user.id,
      twoFactorRequired: true,
      twoFactorToken,
      twoFactorMethods: ['totp', 'backup_code'],
    });
  }

  /**
   * Standard login flow when 2FA is not enabled and the account is active.
   * Creates a new user session and generates access & refresh tokens.
   */
  private async handleStandardLogin(
    user: AdminUserEntity,
    requestInfo?: SessionRequestInfo,
  ): Promise<AdminUserLoginResDto> {
    const { tokens } = await this.createLoginSessionAndTokens(
      user.id,
      requestInfo,
    );

    return plainToInstance(AdminUserLoginResDto, {
      userId: user.id,
      ...tokens,
    });
  }

  /**
   * Admin login entrypoint.
   * Validates credentials and routes to deleted account restoration,
   * 2FA challenge, or standard session creation.
   */
  async login(
    dto: AdminUserLoginReqDto,
    requestInfo?: SessionRequestInfo,
  ): Promise<AdminUserLoginResDto> {
    const user = await this.validateCredentials(dto.email, dto.password);

    if (user.deletedAt) {
      return this.handleDeletedAccount(user);
    }

    if (user.twoFactorEnabled) {
      return this.handleTwoFactorLogin(user);
    }

    return this.handleStandardLogin(user, requestInfo);
  }

  async register(dto: AdminUserRegisterReqDto): Promise<RegisterResDto> {
    const isExistUser = await AdminUserEntity.exists({
      where: { email: dto.email },
    });

    if (isExistUser) {
      throw new ValidationException(ErrorCode.E003);
    }

    const roles = await this.adminUserRepository.manager
      .getRepository(RoleEntity)
      .findBy({ id: In(dto.roleIds) });

    if (roles.length !== dto.roleIds.length) {
      throw new ValidationException(ErrorCode.E002);
    }

    const user = this.adminUserRepository.create({
      firstName: dto.first_name,
      lastName: dto.last_name,
      email: dto.email,
      roles,
    });

    await this.adminUserRepository.save(user);

    await this.adminAccountRepository.save(
      new AdminAccountEntity({
        adminUserId: user.id,
        provider: EAccountProvider.LOCAL,
        providerAccountId: user.email,
        password: dto.password,
      }),
    );

    await this.adminAccountRecoveryService.sendVerificationEmail(user);

    return plainToInstance(RegisterResDto, {
      userId: user.id,
    });
  }

  async me(id: AutoIncrementID): Promise<AdminUserResDto> {
    assert(id, 'id is required');
    const user = await this.adminUserRepository.findOne({
      where: { id },
      relations: ['roles', 'roles.permissionEntities'],
    });

    if (!user) {
      throw new ForbiddenException('Forbidden');
    }

    if (user.avatar && !user.avatar.startsWith('http')) {
      user.avatar = this.filesystemService.disk('public').url(user.avatar);
    }

    return user.toDto(AdminUserResDto);
  }

  async updateMe(
    id: AutoIncrementID,
    dto: UpdateMeReqDto,
    file?: Express.Multer.File,
  ): Promise<{ message: string }> {
    const user = await this.adminUserRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let avatarPath: string | undefined;

    if (file) {
      const filename = `avatars/admin-${id}-${Date.now()}${file.originalname.substring(file.originalname.lastIndexOf('.'))}`;
      await this.filesystemService
        .disk('public')
        .put(filename, file.buffer, { mimeType: file.mimetype });
      avatarPath = this.filesystemService.disk('public').url(filename);
    }

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName;
    }
    if (dto.phone !== undefined) {
      user.phone = dto.phone;
    }
    if (dto.bio !== undefined) {
      user.bio = dto.bio;
    }
    if (dto.birthday !== undefined) {
      user.birthday = dto.birthday;
    }
    if (dto.removeAvatar) {
      user.avatar = undefined;
    } else if (avatarPath) {
      user.avatar = avatarPath;
    }
    if (dto.notifications !== undefined) {
      user.notifications = dto.notifications;
    }

    await this.adminUserRepository.save(user);

    return {
      message: 'success',
    };
  }

  async changePassword(
    id: AutoIncrementID,
    dto: ChangePasswordReqDto,
    currentSessionId?: string | AutoIncrementID,
  ): Promise<ChangePasswordResDto> {
    const user = await this.adminUserRepository.findOneByOrFail({ id });
    const { isValid } = await this.verifyLocalPassword(user.id, dto.password);

    if (!isValid) {
      throw new ValidationException(ErrorCode.V003);
    }

    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new ValidationException(ErrorCode.V003);
    }

    await this.saveLocalAccountPassword(user, dto.newPassword);

    // Revoke all other active admin sessions upon password change
    await this.authSessionService.revokeAllUserSessions({
      userId: user.id,
      userType: ESessionUserType.ADMIN,
      exceptSessionId: currentSessionId,
    });

    await this.notificationService.notifyAdmin(
      user.id,
      AdminNotificationType.PasswordChanged,
      'Password changed',
      'Your admin account password was changed successfully.',
    );

    return plainToInstance(ChangePasswordResDto, {
      message: 'Change password successfully',
      user: user.toDto(AdminUserResDto),
    });
  }

  async assertPassword(user: AdminUserEntity, password: string): Promise<void> {
    const { isValid } = await this.verifyLocalPassword(user.id, password);

    if (!isValid) {
      throw new ValidationException(ErrorCode.V003);
    }
  }

  async selfDelete(userToken: JwtPayloadType): Promise<void> {
    const user = await this.adminUserRepository.findOneByOrFail({
      id: userToken.id as AutoIncrementID,
    });

    await this.adminUserRepository.softDelete(user.id);
    await this.authSessionService.revokeAllSessions(
      userToken,
      ESessionUserType.ADMIN,
    );

    const deletionDate = new Date();
    deletionDate.setDate(
      deletionDate.getDate() + ACCOUNT_RESTORE_GRACE_PERIOD_DAYS,
    );

    await this.emailQueue.add(JobName.ADMIN_ACCOUNT_DELETION_REQUESTED, {
      email: user.email,
      adminName: user.fullName || user.firstName,
      deletionDate: deletionDate.toISOString(),
    } as IAdminAccountDeletionRequestedEmailJob);
  }

  async restoreAccount(
    dto: RestoreAccountReqDto,
    requestInfo?: SessionRequestInfo,
  ): Promise<AdminUserLoginResDto> {
    let payload: JwtPayloadType & { purpose?: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.token, {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Token is invalid or expired.');
    }

    if (payload.purpose !== 'admin-restore-account') {
      throw new UnauthorizedException('Token is invalid or expired.');
    }

    const user = await this.adminUserRepository.findOne({
      where: { id: payload.id as AutoIncrementID },
      withDeleted: true,
    });

    if (!user || !user.deletedAt) {
      throw new UnauthorizedException('Account not found or already restored.');
    }

    await this.adminUserRepository.restore(user.id);

    // SECURITY: If account has 2FA enabled, enforce 2FA verification before creating session
    if (user.twoFactorEnabled) {
      return this.handleTwoFactorLogin(user);
    }

    const { tokens } = await this.createLoginSessionAndTokens(
      user.id,
      requestInfo,
    );

    return plainToInstance(AdminUserLoginResDto, {
      userId: user.id,
      ...tokens,
    });
  }
}
