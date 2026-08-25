import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import * as crypto from 'crypto';
import ms, { StringValue } from 'ms';
import { Repository } from 'typeorm';

import { AdminNotificationType } from '@/api/notification/notification.service';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import { createCacheKey } from '@/utils/cache.util';
import { generateSecret, generateURI } from 'otplib';
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
import {
  AdminAuthService,
  SessionRequestInfo,
  TWO_FACTOR_ISSUER,
  TWO_FACTOR_SETUP_TTL,
  TwoFactorLoginPayload,
} from './admin-auth.service';

type TwoFactorSetupPayload = {
  secret: string;
  backupCodeHashes: string[];
};

@Injectable()
export class AdminTwoFactorService {
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>,
    @Inject(forwardRef(() => AdminAuthService))
    private readonly adminAuthService: AdminAuthService,
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
    await this.adminAuthService.assertPassword(user, dto.password);

    const secret = generateSecret();
    const backupCodes = this.generateBackupCodes();
    const backupCodeHashes = backupCodes.map((code) =>
      this.hashBackupCode(code),
    );

    await this.cacheManager.set<TwoFactorSetupPayload>(
      createCacheKey(CacheKey.ADMIN_TWO_FACTOR_SETUP, user.id),
      { secret, backupCodeHashes },
      ms(TWO_FACTOR_SETUP_TTL as StringValue),
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

    const isValid = await this.adminAuthService.verifyTotpCode(
      dto.code,
      setup.secret,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid two-factor code');
    }

    await this.adminUserRepository.update(user.id, {
      twoFactorEnabled: true,
      twoFactorSecret: this.adminAuthService.encryptTwoFactorSecret(
        setup.secret,
      ),
      twoFactorBackupCodes: setup.backupCodeHashes,
    });
    await this.cacheManager.del(cacheKey);
    await this.adminAuthService.notifyAdmin(
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
    await this.adminAuthService.assertPassword(user, dto.password);

    await this.adminUserRepository.update(user.id, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
    });
    await this.cacheManager.del(
      createCacheKey(CacheKey.ADMIN_TWO_FACTOR_SETUP, user.id),
    );
    await this.adminAuthService.notifyAdmin(
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
    await this.adminAuthService.assertPassword(user, dto.password);

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
      (await this.adminAuthService.verifyTotpCode(
        dto.code,
        this.adminAuthService.decryptTwoFactorSecret(user.twoFactorSecret),
      )) || (await this.consumeBackupCode(user, dto.code));

    if (!isValid) {
      throw new BadRequestException('Invalid two-factor code');
    }

    const session = await this.adminAuthService.createAdminLoginSession(
      user,
      requestInfo,
    );
    const token = await this.adminAuthService.createToken({
      id: user.id,
      sessionId: session.id,
      hash: session.hash,
    });
    await this.adminAuthService.notifyAdminLogin(user, session);

    return plainToInstance(AdminUserLoginResDto, {
      userId: user.id,
      ...token,
    });
  }

  private verifyTwoFactorLoginToken(token: string): TwoFactorLoginPayload {
    try {
      const payload = this.jwtService.verify<TwoFactorLoginPayload>(token, {
        secret: this.adminAuthService.getTwoFactorSigningSecret(),
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
}
