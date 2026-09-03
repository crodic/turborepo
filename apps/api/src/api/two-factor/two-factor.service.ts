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
} from '@/api/auth/dto/two-factor';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { SessionRequestInfo } from '@/api/auth/types/session-request-info.type';
import {
  AdminNotificationType,
  NotificationService,
} from '@/api/notification/notification.service';
import { SessionEntity } from '@/api/session/entities/session.entity';
import { SessionService } from '@/api/session/session.service';
import { UserEntity } from '@/api/user/entities/user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import { DomainType } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { createCacheKey } from '@/utils/cache.util';
import { verifyPassword } from '@/utils/password.util';
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
import { TwoFactorEntity } from './entities/two-factor.entity';

export type TwoFactorSetupPayload = {
  secret: string;
  backupCodeHashes: string[];
};

export type TwoFactorLoginPayload = {
  id: string;
  purpose: 'admin-2fa-login' | '2fa-login';
  domain?: DomainType;
};

export const TWO_FACTOR_SETUP_TTL = '10m' as StringValue;
export const TWO_FACTOR_LOGIN_TTL = '5m' as StringValue;

function normalizeUserAgent(userAgent?: string | string[]) {
  return Array.isArray(userAgent) ? userAgent.join(', ') : userAgent;
}

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(TwoFactorEntity)
    private readonly twoFactorRepository: Repository<TwoFactorEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly notificationService: NotificationService,
    private readonly sessionService: SessionService,
  ) {}

  private getSetupCacheKey(userId: AutoIncrementID): string {
    return createCacheKey(CacheKey.TWO_FACTOR_SETUP, userId);
  }

  private getIssuer(domain: DomainType): string {
    const appName =
      this.configService.get<string>('app.name', { infer: true }) || 'app';

    return domain === DomainType.CLIENT ? appName : `${appName} Portal`;
  }

  async twoFactorStatus(
    userToken: JwtPayloadType,
  ): Promise<TwoFactorStatusResDto> {
    const twoFactor = await this.twoFactorRepository.findOneBy({
      userId: userToken.id as AutoIncrementID,
    });

    return plainToInstance(TwoFactorStatusResDto, {
      enabled: twoFactor?.isEnabled ?? false,
    });
  }

  async enableTwoFactor(
    userToken: JwtPayloadType,
    dto: EnableTwoFactorReqDto,
    domain: DomainType = DomainType.ADMIN,
  ): Promise<EnableTwoFactorResDto> {
    const user = await this.userRepository.findOneOrFail({
      where: { id: userToken.id as AutoIncrementID, domain },
    });
    await this.assertPassword(user, dto.password);

    const secret = generateSecret();
    const backupCodes = this.generateBackupCodes();
    const backupCodeHashes = backupCodes.map((code) =>
      this.hashBackupCode(code),
    );

    await this.cacheManager.set<TwoFactorSetupPayload>(
      this.getSetupCacheKey(user.id),
      { secret, backupCodeHashes },
      ms(TWO_FACTOR_SETUP_TTL),
    );

    return plainToInstance(EnableTwoFactorResDto, {
      totpUri: generateURI({
        issuer: this.getIssuer(domain),
        label: user.email,
        secret,
      }),
      backupCodes,
    });
  }

  async verifyTwoFactorSetup(
    userToken: JwtPayloadType,
    dto: VerifyTwoFactorSetupReqDto,
    domain: DomainType = DomainType.ADMIN,
  ): Promise<VerifyTwoFactorSetupResDto> {
    const user = await this.userRepository.findOneOrFail({
      where: { id: userToken.id as AutoIncrementID, domain },
    });
    const cacheKey = this.getSetupCacheKey(user.id);
    const setup = await this.cacheManager.get<TwoFactorSetupPayload>(cacheKey);

    if (!setup) {
      throw new BadRequestException('Two-factor setup has expired');
    }

    const isValid = await this.verifyTotpCode(dto.code, setup.secret);

    if (!isValid) {
      throw new BadRequestException('Invalid two-factor code');
    }

    let twoFactor = await this.twoFactorRepository.findOneBy({
      userId: user.id,
    });
    if (!twoFactor) {
      twoFactor = this.twoFactorRepository.create({ userId: user.id });
    }
    twoFactor.isEnabled = true;
    twoFactor.secret = this.encryptTwoFactorSecret(setup.secret);
    twoFactor.backupCodes = setup.backupCodeHashes;
    await this.twoFactorRepository.save(twoFactor);

    await this.cacheManager.del(cacheKey);
    if (domain === DomainType.ADMIN) {
      await this.notifyAdmin(
        user.id,
        AdminNotificationType.TwoFactorEnabled,
        'Two-factor authentication enabled',
        'Two-factor authentication was enabled for your admin account.',
      );
    }

    return plainToInstance(VerifyTwoFactorSetupResDto, {
      enabled: true,
      message: 'Two-factor authentication enabled successfully',
    });
  }

  async disableTwoFactor(
    userToken: JwtPayloadType,
    dto: DisableTwoFactorReqDto,
    domain: DomainType = DomainType.ADMIN,
  ): Promise<DisableTwoFactorResDto> {
    const user = await this.userRepository.findOneOrFail({
      where: { id: userToken.id as AutoIncrementID, domain },
    });
    await this.assertPassword(user, dto.password);

    const twoFactor = await this.twoFactorRepository.findOneBy({
      userId: user.id,
    });
    if (twoFactor) {
      twoFactor.isEnabled = false;
      twoFactor.secret = null;
      twoFactor.backupCodes = null;
      await this.twoFactorRepository.save(twoFactor);
    }

    await this.cacheManager.del(this.getSetupCacheKey(user.id));
    if (domain === DomainType.ADMIN) {
      await this.notifyAdmin(
        user.id,
        AdminNotificationType.TwoFactorDisabled,
        'Two-factor authentication disabled',
        'Two-factor authentication was disabled for your admin account.',
      );
    }

    return plainToInstance(DisableTwoFactorResDto, {
      enabled: false,
      message: 'Two-factor authentication disabled successfully',
    });
  }

  async generateTwoFactorBackupCodes(
    userToken: JwtPayloadType,
    dto: EnableTwoFactorReqDto,
    domain: DomainType = DomainType.ADMIN,
  ): Promise<GenerateBackupCodesResDto> {
    const user = await this.userRepository.findOneOrFail({
      where: { id: userToken.id as AutoIncrementID, domain },
    });
    await this.assertPassword(user, dto.password);

    const twoFactor = await this.twoFactorRepository.findOneBy({
      userId: user.id,
    });
    if (!twoFactor?.isEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const backupCodes = this.generateBackupCodes();
    twoFactor.backupCodes = backupCodes.map((code) =>
      this.hashBackupCode(code),
    );
    await this.twoFactorRepository.save(twoFactor);

    return plainToInstance(GenerateBackupCodesResDto, {
      backupCodes,
    });
  }

  async verifyTwoFactorLogin(
    dto: VerifyTwoFactorLoginReqDto,
    domain: DomainType = DomainType.ADMIN,
    requestInfo?: SessionRequestInfo,
  ) {
    const payload = this.verifyTwoFactorLoginToken(dto.twoFactorToken);
    const user = await this.userRepository.findOne({
      where: { id: payload.id as AutoIncrementID, domain },
    });

    const twoFactor = user
      ? await this.twoFactorRepository.findOneBy({ userId: user.id })
      : null;

    if (!user || !twoFactor?.isEnabled || !twoFactor?.secret) {
      throw new UnauthorizedException();
    }

    const isValid =
      (await this.verifyTotpCode(
        dto.code,
        this.decryptTwoFactorSecret(twoFactor.secret),
      )) || (await this.consumeBackupCode(user, dto.code));

    if (!isValid) {
      throw new BadRequestException('Invalid two-factor code');
    }

    const session = await this.createLoginSession(user, domain, requestInfo);
    const token = await this.createToken({
      id: user.id,
      sessionId: session.id,
      hash: session.refreshTokenHash,
    });

    return {
      userId: user.id,
      ...token,
    };
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

  async consumeBackupCode(user: UserEntity, code: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findOneBy({
      userId: user.id,
    });
    if (!twoFactor?.backupCodes) {
      return false;
    }

    const codeHash = this.hashBackupCode(code);
    const backupCodeHashes = twoFactor.backupCodes;

    if (!backupCodeHashes.includes(codeHash)) {
      return false;
    }

    twoFactor.backupCodes = backupCodeHashes.filter(
      (hash) => hash !== codeHash,
    );
    await this.twoFactorRepository.save(twoFactor);

    return true;
  }

  private async assertPassword(
    user: UserEntity,
    password: string,
  ): Promise<void> {
    const isPasswordValid =
      user.password && (await verifyPassword(password, user.password));

    if (!isPasswordValid) {
      throw new ValidationException(ErrorCode.V003);
    }
  }

  private verifyTwoFactorLoginToken(token: string): TwoFactorLoginPayload {
    try {
      const payload = this.jwtService.verify<TwoFactorLoginPayload>(token, {
        secret: this.getTwoFactorSigningSecret(),
      });

      if (
        payload.purpose !== 'admin-2fa-login' &&
        payload.purpose !== '2fa-login'
      ) {
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

  private async createLoginSession(
    user: UserEntity,
    domain: DomainType = DomainType.ADMIN,
    requestInfo?: SessionRequestInfo,
  ): Promise<SessionEntity> {
    const session = this.sessionRepository.create({
      domain,
      userId: user.id,
      ipAddress: requestInfo?.ipAddress,
      userAgent: normalizeUserAgent(requestInfo?.userAgent),
      refreshTokenHash: crypto.randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const savedSession = await this.sessionRepository.save(session);
    await this.sessionService.clearSessionBlacklist(savedSession.id);

    return savedSession;
  }

  private async createToken(data: {
    id: AutoIncrementID;
    sessionId: AutoIncrementID;
    hash: string;
  }) {
    const tokenExpiresIn = this.configService.getOrThrow('auth.expires', {
      infer: true,
    });
    const tokenExpires = Date.now() + ms(tokenExpiresIn as StringValue);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
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
      this.jwtService.signAsync(
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
}

export { TwoFactorService as AdminTwoFactorService };
