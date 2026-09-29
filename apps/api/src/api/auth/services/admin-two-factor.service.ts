import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import * as crypto from 'crypto';
import ms, { StringValue } from 'ms';
import { generateSecret, generateURI, verify as verifyTotp } from 'otplib';
import { Repository } from 'typeorm';

import { AdminAccountEntity } from '@/api/admin-user/entities/admin-account.entity';
import {
  AdminNotificationType,
  NotificationService,
} from '@/api/notification/notification.service';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import { EAccountProvider, ESessionUserType } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { createCacheKey } from '@/utils/cache.util';
import { verifyPassword } from '@/utils/password.util';
import { AdminUserEntity } from '../../admin-user/entities/admin-user.entity';
import { AdminUserLoginResDto } from '../dto/admin-users/admin-user-login.res.dto';
import { DisableTwoFactorReqDto } from '../dto/admin-users/two-factor/disable-two-factor.req.dto';
import { DisableTwoFactorResDto } from '../dto/admin-users/two-factor/disable-two-factor.res.dto';
import { EnableTwoFactorReqDto } from '../dto/admin-users/two-factor/enable-two-factor.req.dto';
import { EnableTwoFactorResDto } from '../dto/admin-users/two-factor/enable-two-factor.res.dto';
import { GenerateBackupCodesResDto } from '../dto/admin-users/two-factor/generate-backup-codes.res.dto';
import { TwoFactorStatusResDto } from '../dto/admin-users/two-factor/two-factor-status.res.dto';
import { VerifyTwoFactorLoginReqDto } from '../dto/admin-users/two-factor/verify-two-factor-login.req.dto';
import { VerifyTwoFactorSetupReqDto } from '../dto/admin-users/two-factor/verify-two-factor-setup.req.dto';
import { VerifyTwoFactorSetupResDto } from '../dto/admin-users/two-factor/verify-two-factor-setup.res.dto';
import { JwtPayloadType } from '../types/jwt-payload.type';
import { SessionRequestInfo } from '../types/session-request-info.type';
import { AuthSessionService } from './auth-session.service';
import { AuthTokenService, TokenSigningConfig } from './auth-token.service';

export type TwoFactorSetupPayload = {
  secret: string;
  backupCodeHashes: string[];
};

export type TwoFactorLoginPayload = {
  id: string;
  purpose: 'admin-2fa-login';
};

export const TWO_FACTOR_ISSUER = 'Crodic Portal';
export const TWO_FACTOR_SETUP_TTL = '10m' as StringValue;
export const TWO_FACTOR_LOGIN_TTL = '5m' as StringValue;

@Injectable()
export class AdminTwoFactorService {
  private readonly logger = new Logger(AdminTwoFactorService.name);

  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(AdminAccountEntity)
    private readonly adminAccountRepository: Repository<AdminAccountEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly notificationService: NotificationService,
    private readonly authSessionService: AuthSessionService,
    private readonly authTokenService: AuthTokenService,
  ) {}

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
    await this.notificationService.notifyAdmin(
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
    await this.notificationService.notifyAdmin(
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

  /**
   * Verify 2FA code (TOTP or backup code) after initial password authentication.
   * On success, creates a login session and returns JWT tokens.
   */
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

    // Reuse shared session + token services instead of duplicating logic
    const hash = this.authTokenService.generateSessionHash();
    const session = await this.authSessionService.createLoginSession({
      userId: user.id,
      userType: ESessionUserType.ADMIN,
      hash,
      requestInfo,
    });

    const tokens = await this.authTokenService.createTokenPair(
      { id: user.id, sessionId: session.id, hash: session.hash },
      this.getAdminTokenConfig(),
    );

    return plainToInstance(AdminUserLoginResDto, {
      userId: user.id,
      ...tokens,
    });
  }

  async createTwoFactorLoginToken(
    data: TwoFactorLoginPayload,
  ): Promise<string> {
    return this.jwtService.signAsync(data, {
      secret: this.getTwoFactorSigningSecret(),
      expiresIn: TWO_FACTOR_LOGIN_TTL,
    });
  }

  async verifyTotpCode(code: string, secret: string): Promise<boolean> {
    const result = await verifyTotp({
      token: code.trim().replace(/\s+/g, ''),
      secret,
      epochTolerance: 1,
    });

    return result.valid === true;
  }

  getTwoFactorSigningSecret(): string {
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

  encryptTwoFactorSecret(secret: string): string {
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

  decryptTwoFactorSecret(value: string): string {
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

  async consumeBackupCode(
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

  /**
   * Verify admin password against local account credentials.
   * Used before enabling/disabling 2FA and regenerating backup codes.
   */
  private async assertPassword(
    user: AdminUserEntity,
    password: string,
  ): Promise<void> {
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

  /** Reuse shared admin token config for session/token creation. */
  private getAdminTokenConfig(): TokenSigningConfig {
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
}
