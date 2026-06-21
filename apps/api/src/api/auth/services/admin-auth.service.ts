import { AVATAR_PATH } from '@/api/admin-user/configs/multer.config';
import { AdminUserResDto } from '@/api/admin-user/dto/admin-user.res.dto';
import { ChangePasswordReqDto } from '@/api/admin-user/dto/change-password.req.dto';
import { ChangePasswordResDto } from '@/api/admin-user/dto/change-password.res.dto';
import { UpdateMeReqDto } from '@/api/admin-user/dto/update-me.req.dto';
import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { SessionEntity } from '@/api/auth/entities/session.entity';
import {
  AdminNotificationType,
  NotificationService,
} from '@/api/notification/notification.service';
import { RoleEntity } from '@/api/role/entities/role.entity';
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
import { ESessionUserType } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { JobName, QueueName } from '@/constants/job.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { createCacheKey } from '@/utils/cache.util';
import { deleteFile } from '@/utils/filesystem';
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
import { generateSecret, generateURI, verify as verifyTotp } from 'otplib';
import { In, IsNull, Repository } from 'typeorm';
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
import { VerifyAccountResDto } from '../dto/verify-account.req.dto';
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

type TwoFactorSetupPayload = {
  secret: string;
  backupCodeHashes: string[];
};

type TwoFactorLoginPayload = {
  id: string;
  purpose: 'admin-2fa-login';
};

const TWO_FACTOR_ISSUER = 'Crodic Portal';
const TWO_FACTOR_SETUP_TTL = '10m' as StringValue;
const TWO_FACTOR_LOGIN_TTL = '5m' as StringValue;

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectQueue(QueueName.EMAIL)
    private readonly emailQueue: Queue<IEmailJob, any, string>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly notificationService: NotificationService,
  ) {}

  async login(
    dto: AdminUserLoginReqDto,
    requestInfo?: SessionRequestInfo,
  ): Promise<AdminUserLoginResDto> {
    const { email, password } = dto;
    const user = await this.adminUserRepository.findOne({
      where: { email },
    });

    const isPasswordValid =
      user && (await verifyPassword(password, user.password));

    if (!isPasswordValid) {
      throw new BadRequestException({ message: 'Invalid credentials' });
    }

    if (user.twoFactorEnabled) {
      const twoFactorToken = await this.createTwoFactorLoginToken({
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

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = new SessionEntity({
      hash,
      userId: user.id as AutoIncrementID,
      userType: ESessionUserType.ADMIN,
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
    await this.notifyAdmin(
      user.id,
      AdminNotificationType.NewSession,
      'New sign-in detected',
      'A new admin session was created for your account.',
      this.buildSessionNotificationData(session),
    );

    return plainToInstance(AdminUserLoginResDto, {
      userId: user.id,
      ...token,
    });
  }

  async twoFactorStatus(
    userToken: JwtPayloadType,
  ): Promise<TwoFactorStatusResDto> {
    const user = await this.adminUserRepository.findOneByOrFail({
      id: userToken.id as AutoIncrementID,
    });

    return plainToInstance(TwoFactorStatusResDto, {
      enabled: user.twoFactorEnabled,
    });
  }

  async enableTwoFactor(
    userToken: JwtPayloadType,
    dto: EnableTwoFactorReqDto,
  ): Promise<EnableTwoFactorResDto> {
    const user = await this.adminUserRepository.findOneByOrFail({
      id: userToken.id as AutoIncrementID,
    });
    await this.assertPassword(user, dto.password);

    const secret = generateSecret();
    const backupCodes = this.generateBackupCodes();
    const backupCodeHashes = backupCodes.map((code) =>
      this.hashBackupCode(code),
    );

    await this.cacheManager.set<TwoFactorSetupPayload>(
      createCacheKey(CacheKey.ADMIN_TWO_FACTOR_SETUP, user.id),
      { secret, backupCodeHashes },
      ms(TWO_FACTOR_SETUP_TTL),
    );

    return plainToInstance(EnableTwoFactorResDto, {
      totpUri: generateURI({
        issuer: TWO_FACTOR_ISSUER,
        label: user.email,
        secret,
      }),
      backupCodes,
    });
  }

  async verifyTwoFactorSetup(
    userToken: JwtPayloadType,
    dto: VerifyTwoFactorSetupReqDto,
  ): Promise<VerifyTwoFactorSetupResDto> {
    const user = await this.adminUserRepository.findOneByOrFail({
      id: userToken.id as AutoIncrementID,
    });
    const cacheKey = createCacheKey(CacheKey.ADMIN_TWO_FACTOR_SETUP, user.id);
    const setup = await this.cacheManager.get<TwoFactorSetupPayload>(cacheKey);

    if (!setup) {
      throw new BadRequestException('Two-factor setup has expired');
    }

    const isValid = await this.verifyTotpCode(dto.code, setup.secret);

    if (!isValid) {
      throw new BadRequestException('Invalid two-factor code');
    }

    await this.adminUserRepository.update(user.id, {
      twoFactorEnabled: true,
      twoFactorSecret: this.encryptTwoFactorSecret(setup.secret),
      twoFactorBackupCodes: setup.backupCodeHashes,
    });
    await this.cacheManager.del(cacheKey);
    await this.notifyAdmin(
      user.id,
      AdminNotificationType.TwoFactorEnabled,
      'Two-factor authentication enabled',
      'Two-factor authentication was enabled for your admin account.',
    );

    return plainToInstance(VerifyTwoFactorSetupResDto, {
      enabled: true,
      message: 'Two-factor authentication enabled successfully',
    });
  }

  async disableTwoFactor(
    userToken: JwtPayloadType,
    dto: DisableTwoFactorReqDto,
  ): Promise<DisableTwoFactorResDto> {
    const user = await this.adminUserRepository.findOneByOrFail({
      id: userToken.id as AutoIncrementID,
    });
    await this.assertPassword(user, dto.password);

    await this.adminUserRepository.update(user.id, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
    });
    await this.cacheManager.del(
      createCacheKey(CacheKey.ADMIN_TWO_FACTOR_SETUP, user.id),
    );
    await this.notifyAdmin(
      user.id,
      AdminNotificationType.TwoFactorDisabled,
      'Two-factor authentication disabled',
      'Two-factor authentication was disabled for your admin account.',
    );

    return plainToInstance(DisableTwoFactorResDto, {
      enabled: false,
      message: 'Two-factor authentication disabled successfully',
    });
  }

  async generateTwoFactorBackupCodes(
    userToken: JwtPayloadType,
    dto: EnableTwoFactorReqDto,
  ): Promise<GenerateBackupCodesResDto> {
    const user = await this.adminUserRepository.findOneByOrFail({
      id: userToken.id as AutoIncrementID,
    });
    await this.assertPassword(user, dto.password);

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const backupCodes = this.generateBackupCodes();
    await this.adminUserRepository.update(user.id, {
      twoFactorBackupCodes: backupCodes.map((code) =>
        this.hashBackupCode(code),
      ),
    });

    return plainToInstance(GenerateBackupCodesResDto, {
      backupCodes,
    });
  }

  async verifyTwoFactorLogin(
    dto: VerifyTwoFactorLoginReqDto,
    requestInfo?: SessionRequestInfo,
  ): Promise<AdminUserLoginResDto> {
    const payload = this.verifyTwoFactorLoginToken(dto.twoFactorToken);
    const user = await this.adminUserRepository.findOneBy({
      id: payload.id as AutoIncrementID,
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException();
    }

    const isValid =
      (await this.verifyTotpCode(
        dto.code,
        this.decryptTwoFactorSecret(user.twoFactorSecret),
      )) || (await this.consumeBackupCode(user, dto.code));

    if (!isValid) {
      throw new BadRequestException('Invalid two-factor code');
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = new SessionEntity({
      hash,
      userId: user.id as AutoIncrementID,
      userType: ESessionUserType.ADMIN,
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
    await this.notifyAdmin(
      user.id,
      AdminNotificationType.NewSession,
      'New sign-in detected',
      'A new admin session was created for your account.',
      this.buildSessionNotificationData(session),
    );

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
      password: dto.password,
      roles,
    });

    await this.adminUserRepository.save(user);

    const token = await this.createVerificationToken({ id: user.id });
    const tokenExpiresIn = this.configService.getOrThrow(
      'auth.confirmEmailExpires',
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
      JobName.ADMIN_EMAIL_VERIFICATION,
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

    const user = await this.adminUserRepository.findOneBy({ id });

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
    const user = await AdminUserEntity.findOne({
      where: { email: dto.email },
    });

    if (user) {
      const token = await this.createVerificationToken({ id: user.id });
      const tokenExpiresIn = this.configService.getOrThrow(
        'auth.confirmEmailExpires',
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
        JobName.ADMIN_EMAIL_VERIFICATION,
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

  async forgotPassword(
    dto: ForgotPasswordReqDto,
  ): Promise<ForgotPasswordResDto> {
    const admin = await this.adminUserRepository.findOneOrFail({
      where: { email: dto.email },
    });

    if (!admin) {
      throw new ValidationException(ErrorCode.E004);
    }

    const token = await this.createForgotToken({ id: admin.id });
    const tokenExpiresIn = this.configService.getOrThrow('auth.forgotExpires', {
      infer: true,
    });

    await this.cacheManager.set(
      createCacheKey(CacheKey.FORGOT_PASSWORD, admin.id),
      token,
      ms(tokenExpiresIn as StringValue),
    );

    await this.emailQueue.add(
      JobName.ADMIN_EMAIL_FORGOT_PASSWORD,
      {
        email: dto.email,
        token,
      } as IForgotPasswordEmailJob,
      { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    );

    const portalResetPasswordUrl = this.configService.getOrThrow(
      'auth.portalResetPasswordUrl',
      {
        infer: true,
      },
    );

    return plainToInstance(ForgotPasswordResDto, {
      redirect: `${portalResetPasswordUrl}?token=${token}`,
    });
  }

  async resetPassword(
    token: string,
    dto: ResetPasswordReqDto,
  ): Promise<ResetPasswordResDto> {
    const { id } = this.verifyForgotPasswordToken(token);

    const user = await this.adminUserRepository.findOneBy({ id });

    if (!user) {
      throw new BadRequestException();
    }

    await this.cacheManager.del(createCacheKey(CacheKey.FORGOT_PASSWORD, id));

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException();
    }

    user.password = dto.password;

    await user.save();
    await this.notifyAdmin(
      user.id,
      AdminNotificationType.PasswordReset,
      'Password reset completed',
      'Your admin account password was reset successfully.',
    );

    return plainToInstance(ResetPasswordResDto, {
      success: true,
      message: 'Reset password successfully. Please login to continue website',
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

    return user.toDto(AdminUserResDto);
  }

  async updateMe(
    id: AutoIncrementID,
    dto: UpdateMeReqDto,
    file: Express.Multer.File,
  ): Promise<{ message: string }> {
    const user = await this.adminUserRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    delete user.password;

    if (dto.removeAvatar || file) {
      await deleteFile(user.avatar);
      user.avatar = null;
    }

    Object.assign(user, {
      ...dto,
      updatedBy: id,
      ...(file && { avatar: AVATAR_PATH + '/' + file.filename }),
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
    const isPasswordValid = await verifyPassword(dto.password, user.password);
    if (!isPasswordValid) {
      throw new ValidationException(ErrorCode.V003);
    }

    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new ValidationException(ErrorCode.V003);
    }

    user.password = dto.newPassword;

    await this.adminUserRepository.save(user);
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

  async logout(userToken: JwtPayloadType): Promise<void> {
    await this.revokeCurrentSession(userToken);
  }

  async listSessions(userToken: JwtPayloadType): Promise<SessionResDto[]> {
    const sessions = await this.sessionRepository.find({
      where: {
        userId: userToken.id as AutoIncrementID,
        userType: ESessionUserType.ADMIN,
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
        userType: ESessionUserType.ADMIN,
        revokedAt: IsNull(),
      },
      { revokedAt: new Date() },
    );

    if (result.affected === 0) {
      throw new NotFoundException('Session not found');
    }

    await this.blacklistSession(sessionId);
    await this.notifyAdmin(
      userToken.id,
      AdminNotificationType.SessionRevoked,
      'Session revoked',
      'One of your admin sessions was revoked.',
      { sessionId },
    );

    return { message: 'Session revoked successfully' };
  }

  async revokeAllSessions(
    userToken: JwtPayloadType,
  ): Promise<{ message: string }> {
    const sessions = await this.sessionRepository.find({
      where: {
        userId: userToken.id as AutoIncrementID,
        userType: ESessionUserType.ADMIN,
        revokedAt: IsNull(),
      },
      select: ['id'],
    });

    if (sessions.length > 0) {
      await this.sessionRepository.update(
        {
          id: In(sessions.map((session) => session.id)),
          userId: userToken.id as AutoIncrementID,
          userType: ESessionUserType.ADMIN,
          revokedAt: IsNull(),
        },
        { revokedAt: new Date() },
      );

      await Promise.all(
        sessions.map((session) => this.blacklistSession(session.id)),
      );
      await this.notifyAdmin(
        userToken.id,
        AdminNotificationType.SessionsRevokedAll,
        'All sessions revoked',
        'All active admin sessions on your account were revoked.',
        { sessionIds: sessions.map((session) => session.id) },
      );
    }

    return { message: 'Sessions revoked successfully' };
  }

  async impersonateUser(
    adminToken: JwtPayloadType,
    dto: ImpersonateUserReqDto,
    requestInfo?: SessionRequestInfo,
  ): Promise<ImpersonateUserResDto> {
    const user = await this.userRepository.findOneBy({ id: dto.userId as any });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');
    const expiresIn = '1h' as StringValue;
    const expiresAt = new Date(Date.now() + ms(expiresIn));
    const session = await this.sessionRepository.save(
      this.sessionRepository.create({
        hash,
        userId: user.id,
        userType: ESessionUserType.USER,
        impersonatedBy: adminToken.id as AutoIncrementID,
        ipAddress: requestInfo?.ipAddress,
        userAgent: normalizeUserAgent(requestInfo?.userAgent),
        expiresAt,
      }),
    );
    await this.clearSessionBlacklist(session.id);

    const tokenExpiresIn = this.configService.getOrThrow('auth.userExpires', {
      infer: true,
    });
    const tokenExpires = Date.now() + ms(tokenExpiresIn as StringValue);
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          id: user.id,
          sessionId: session.id,
          hash,
        },
        {
          secret: this.configService.getOrThrow('auth.userSecret', {
            infer: true,
          }),
          expiresIn: tokenExpiresIn as StringValue,
        },
      ),
      this.jwtService.signAsync(
        {
          sessionId: session.id,
          hash,
        },
        {
          secret: this.configService.getOrThrow('auth.userRefreshSecret', {
            infer: true,
          }),
          expiresIn,
        },
      ),
    ]);

    return plainToInstance(
      ImpersonateUserResDto,
      {
        userId: user.id,
        impersonatedBy: adminToken.id,
        session,
        accessToken,
        refreshToken,
        tokenExpires,
        expiresAt,
        callbackUrl: dto.callbackUrl,
        redirectUrl: dto.callbackUrl,
      },
      { excludeExtraneousValues: true },
    );
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

  private async revokeCurrentSession(userToken: JwtPayloadType) {
    await this.blacklistSession(userToken.sessionId as AutoIncrementID);
    await this.sessionRepository.update(
      {
        id: userToken.sessionId as AutoIncrementID,
        userId: userToken.id as AutoIncrementID,
        userType: ESessionUserType.ADMIN,
        revokedAt: IsNull(),
      },
      { revokedAt: new Date() },
    );
  }

  private async blacklistSession(sessionId: AutoIncrementID | string) {
    const refreshExpires = this.configService.getOrThrow(
      'auth.refreshExpires',
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

  private buildSessionNotificationData(session: SessionEntity) {
    return {
      sessionId: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    };
  }

  private async notifyAdmin(
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

  private async assertPassword(
    user: AdminUserEntity,
    password: string,
  ): Promise<void> {
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      throw new ValidationException(ErrorCode.V003);
    }
  }

  private async createTwoFactorLoginToken(
    data: TwoFactorLoginPayload,
  ): Promise<string> {
    return this.jwtService.signAsync(data, {
      secret: this.getTwoFactorSigningSecret(),
      expiresIn: TWO_FACTOR_LOGIN_TTL,
    });
  }

  private verifyTwoFactorLoginToken(token: string): TwoFactorLoginPayload {
    try {
      const payload = this.jwtService.verify<TwoFactorLoginPayload>(token, {
        secret: this.getTwoFactorSigningSecret(),
      });

      if (payload.purpose !== 'admin-2fa-login') {
        throw new UnauthorizedException();
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Two-factor verification expired');
    }
  }

  private getTwoFactorSigningSecret(): string {
    return crypto
      .createHash('sha256')
      .update(
        `${this.configService.getOrThrow('auth.secret', { infer: true })}:admin-2fa`,
      )
      .digest('hex');
  }

  private getTwoFactorEncryptionKey(): Buffer {
    return crypto
      .createHash('sha256')
      .update(
        `${this.configService.getOrThrow('auth.secret', { infer: true })}:admin-2fa-secret`,
      )
      .digest();
  }

  private encryptTwoFactorSecret(secret: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      this.getTwoFactorEncryptionKey(),
      iv,
    );
    const encrypted = Buffer.concat([
      cipher.update(secret, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  private decryptTwoFactorSecret(value: string): string {
    const [ivValue, tagValue, encryptedValue] = value.split('.');

    if (!ivValue || !tagValue || !encryptedValue) {
      throw new UnauthorizedException('Invalid two-factor secret');
    }

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.getTwoFactorEncryptionKey(),
      Buffer.from(ivValue, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private async verifyTotpCode(code: string, secret: string): Promise<boolean> {
    const result = await verifyTotp({
      token: code.trim().replace(/\s+/g, ''),
      secret,
      epochTolerance: 1,
    });

    return result.valid === true;
  }

  private generateBackupCodes(): string[] {
    return Array.from({ length: 10 }, () =>
      crypto.randomBytes(5).toString('hex').toUpperCase(),
    );
  }

  private hashBackupCode(code: string): string {
    return crypto
      .createHash('sha256')
      .update(code.trim().replace(/\s+/g, '').toUpperCase())
      .digest('hex');
  }

  private async consumeBackupCode(
    user: AdminUserEntity,
    code: string,
  ): Promise<boolean> {
    const codeHash = this.hashBackupCode(code);
    const backupCodeHashes = user.twoFactorBackupCodes ?? [];

    if (!backupCodeHashes.includes(codeHash)) {
      return false;
    }

    await this.adminUserRepository.update(user.id, {
      twoFactorBackupCodes: backupCodeHashes.filter(
        (hash) => hash !== codeHash,
      ),
    });

    return true;
  }

  private async createVerificationToken(data: { id: string }): Promise<string> {
    return await this.jwtService.signAsync(
      {
        id: data.id,
      },
      {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
          infer: true,
        }),
      },
    );
  }

  private async createForgotToken(data: { id: string }): Promise<string> {
    return await this.jwtService.signAsync(
      {
        id: data.id,
      },
      {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow('auth.forgotExpires', {
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

  private verifyEmailToken(token: string): JwtForgotPasswordPayload {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
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
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
      });
    } catch {
      throw new HttpException('URL không còn khả dụng', HttpStatus.GONE);
    }
  }
}

function normalizeUserAgent(userAgent?: string | string[]) {
  return Array.isArray(userAgent) ? userAgent.join(', ') : userAgent;
}
