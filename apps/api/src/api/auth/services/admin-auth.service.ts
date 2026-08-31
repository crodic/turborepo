import { AdminUserResDto } from '@/api/admin-user/dto/admin-user.res.dto';
import { ChangePasswordReqDto } from '@/api/admin-user/dto/change-password.req.dto';
import { ChangePasswordResDto } from '@/api/admin-user/dto/change-password.res.dto';
import { UpdateMeReqDto } from '@/api/admin-user/dto/update-me.req.dto';
import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { AdminAccountEntity } from '@/api/auth/entities/admin-account.entity';
import { SessionEntity } from '@/api/auth/entities/session.entity';
import {
  AdminNotificationType,
  NotificationService,
} from '@/api/notification/notification.service';
import { RoleEntity } from '@/api/role/entities/role.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { IEmailJob } from '@/common/interfaces/job.interface';
import { AutoIncrementID } from '@/common/types/common.type';
import { Branded } from '@/common/types/types';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import { EAccountProvider, ESessionUserType } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { JobName, QueueName } from '@/constants/job.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { FilesystemService } from '@/filesystem/filesystem.service';
import { createCacheKey } from '@/utils/cache.util';
import { verifyPassword } from '@/utils/password.util';
import { InjectQueue } from '@nestjs/bullmq';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ForbiddenException,
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
import path from 'path';
import { In, IsNull, Repository } from 'typeorm';
import { AdminUserLoginReqDto } from '../dto/admin-users/admin-user-login.req.dto';
import { AdminUserLoginResDto } from '../dto/admin-users/admin-user-login.res.dto';
import { AdminUserRegisterReqDto } from '../dto/admin-users/admin-user-register.req.dto';
import { RestoreAccountReqDto } from '../dto/admin-users/restore-account.req.dto';
import { RefreshReqDto } from '../dto/refresh.req.dto';
import { RefreshResDto } from '../dto/refresh.res.dto';
import { RegisterResDto } from '../dto/register.res.dto';
import { JwtPayloadType } from '../types/jwt-payload.type';
import { JwtRefreshPayloadType } from '../types/jwt-refresh-payload.type';
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

export { TWO_FACTOR_ISSUER, TWO_FACTOR_SETUP_TTL };
export type {
  SessionRequestInfo,
  TwoFactorLoginPayload,
  TwoFactorSetupPayload,
};

type Token = Branded<
  {
    accessToken: string;
    refreshToken: string;
    tokenExpires: number;
  },
  'token'
>;

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    private readonly filesystemService: FilesystemService,
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(AdminAccountEntity)
    private readonly adminAccountRepository: Repository<AdminAccountEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectQueue(QueueName.EMAIL)
    private readonly emailQueue: Queue<IEmailJob, any, string>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly notificationService: NotificationService,
    private readonly authSessionService: AuthSessionService,
    private readonly adminTwoFactorService: AdminTwoFactorService,
    private readonly adminAccountRecoveryService: AdminAccountRecoveryService,
  ) {}

  async login(
    dto: AdminUserLoginReqDto,
    requestInfo?: SessionRequestInfo,
  ): Promise<AdminUserLoginResDto> {
    const { email, password } = dto;
    const user = await this.adminUserRepository.findOne({
      where: { email },
      withDeleted: true,
    });

    const localAccount = user
      ? await this.adminAccountRepository.findOne({
          where: {
            adminUserId: user.id,
            provider: EAccountProvider.LOCAL,
          },
        })
      : null;

    const isPasswordValid =
      localAccount &&
      localAccount.password &&
      (await verifyPassword(password, localAccount.password));

    if (!isPasswordValid) {
      throw new BadRequestException({ message: 'Invalid credentials' });
    }

    if (!user.verifiedAt) {
      throw new ForbiddenException({
        message: 'Vui lòng xác thực email trước khi đăng nhập',
        code: 'UNVERIFIED_EMAIL',
      });
    }

    if (user.deletedAt) {
      const msIn30Days = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - user.deletedAt.getTime() > msIn30Days) {
        throw new BadRequestException({ message: 'Invalid credentials' });
      }

      const payload = { id: user.id } as any;
      const restoreToken = await this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
        expiresIn: '5m',
      });

      return plainToInstance(AdminUserLoginResDto, {
        userId: user.id,
        restoreAccountRequired: true,
        restoreToken,
      });
    }

    if (user.twoFactorEnabled) {
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

    const session = await this.createAdminLoginSession(user, requestInfo);
    const token = await this.createToken({
      id: user.id,
      sessionId: session.id,
      hash: session.hash,
    });

    return plainToInstance(AdminUserLoginResDto, {
      userId: user.id,
      ...token,
    });
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

  async refreshToken(dto: RefreshReqDto): Promise<RefreshResDto> {
    const { sessionId, hash } = this.verifyRefreshToken(dto.refreshToken);
    const session = await this.sessionRepository.findOneBy({
      id: sessionId,
      userType: ESessionUserType.ADMIN,
      revokedAt: IsNull(),
    });

    if (!session || session.hash !== hash) {
      throw new ForbiddenException();
    }

    const user = await this.adminUserRepository.findOneOrFail({
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
        userType: ESessionUserType.ADMIN,
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

    if (dto.removeAvatar || file) {
      if (user.avatar) {
        const relativePath = user.avatar
          .replace(/^.*\/storage\/public\//, '')
          .replace(/^.*\/storage\//, '')
          .replace(/^storage\/public\//, '')
          .replace(/^storage\//, '')
          .replace(/^\/+/, '');
        await this.filesystemService.disk('public').delete(relativePath);
      }
      user.avatar = null;
    }

    let avatarPath: string | undefined = undefined;
    if (file) {
      const ext = path.extname(file.originalname) || '.png';
      const filename = `avatars/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      await this.filesystemService.disk('public').put(filename, file.buffer, {
        mimeType: file.mimetype,
        visibility: 'public',
      });
      avatarPath = this.filesystemService.disk('public').url(filename);
    }

    Object.assign(user, {
      ...dto,
      updatedBy: id,
      ...(avatarPath && { avatar: avatarPath }),
    });

    await this.adminUserRepository.save(user);

    return {
      message: 'success',
    };
  }

  async changePassword(
    id: AutoIncrementID,
    dto: ChangePasswordReqDto,
  ): Promise<ChangePasswordResDto> {
    const user = await this.adminUserRepository.findOneByOrFail({ id });
    const localAccount = await this.adminAccountRepository.findOne({
      where: {
        adminUserId: user.id,
        provider: EAccountProvider.LOCAL,
      },
    });

    const isPasswordValid =
      localAccount &&
      localAccount.password &&
      (await verifyPassword(dto.password, localAccount.password));

    if (!isPasswordValid) {
      throw new ValidationException(ErrorCode.V003);
    }

    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new ValidationException(ErrorCode.V003);
    }

    if (!localAccount) {
      const newAccount = new AdminAccountEntity({
        adminUserId: user.id,
        provider: EAccountProvider.LOCAL,
        providerAccountId: user.email,
        password: dto.newPassword,
      });
      await this.adminAccountRepository.save(newAccount);
    } else {
      localAccount.password = dto.newPassword;
      await this.adminAccountRepository.save(localAccount);
    }

    await this.notifyAdmin(
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

  async verifyAccessToken(token: string): Promise<JwtPayloadType> {
    let payload: JwtPayloadType;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
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
      userType: ESessionUserType.ADMIN,
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

  async createAdminLoginSession(
    user: AdminUserEntity,
    requestInfo?: SessionRequestInfo,
  ): Promise<SessionEntity> {
    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');
    const ipAddress = requestInfo?.ipAddress;
    const userAgent = normalizeUserAgent(requestInfo?.userAgent);

    const session = new SessionEntity({
      hash,
      userId: user.id as AutoIncrementID,
      userType: ESessionUserType.ADMIN,
      ipAddress,
      userAgent,
    });
    const savedSession = await this.sessionRepository.save(session);
    await this.authSessionService.clearSessionBlacklist(savedSession.id);

    return savedSession;
  }

  async notifyAdmin(
    adminId: AutoIncrementID | string,
    type: AdminNotificationType,
    title: string,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.notificationService.createForAdmin({
        adminId,
        type,
        title,
        message,
        data,
      });
    } catch (error) {
      this.logger.warn(`Failed to create admin notification: ${error}`);
    }
  }

  private verifyRefreshToken(token: string): JwtRefreshPayloadType {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.refreshSecret', {
          infer: true,
        }),
      });
    } catch {
      throw new UnauthorizedException();
    }
  }

  async assertPassword(user: AdminUserEntity, password: string): Promise<void> {
    const localAccount = await this.adminAccountRepository.findOne({
      where: {
        adminUserId: user.id,
        provider: EAccountProvider.LOCAL,
      },
    });

    const isPasswordValid =
      localAccount &&
      localAccount.password &&
      (await verifyPassword(password, localAccount.password));

    if (!isPasswordValid) {
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
    deletionDate.setDate(deletionDate.getDate() + 30);

    await this.emailQueue.add(JobName.ADMIN_ACCOUNT_DELETION_REQUESTED, {
      email: user.email,
      adminName: user.fullName || user.firstName,
      deletionDate: deletionDate.toISOString(),
    } as any);
  }

  async restoreAccount(
    dto: RestoreAccountReqDto,
    requestInfo?: SessionRequestInfo,
  ): Promise<AdminUserLoginResDto> {
    let payload: JwtPayloadType;
    try {
      payload = await this.jwtService.verifyAsync(dto.token, {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
      });
    } catch {
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

    const session = await this.createAdminLoginSession(user, requestInfo);
    const token = await this.createToken({
      id: user.id,
      sessionId: session.id,
      hash: session.hash,
    });

    return plainToInstance(AdminUserLoginResDto, {
      userId: user.id,
      ...token,
    });
  }

  async createToken(data: {
    id: string;
    sessionId: string;
    hash: string;
  }): Promise<Token> {
    const tokenExpiresIn = this.configService.getOrThrow('auth.expires', {
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
          secret: this.configService.getOrThrow('auth.secret', { infer: true }),
          expiresIn: tokenExpiresIn as StringValue,
        },
      ),
      await this.jwtService.signAsync(
        {
          sessionId: data.sessionId,
          hash: data.hash,
        },
        {
          secret: this.configService.getOrThrow('auth.refreshSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.refreshExpires', {
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
}

function normalizeUserAgent(userAgent?: string | string[]) {
  return Array.isArray(userAgent) ? userAgent.join(', ') : userAgent;
}
