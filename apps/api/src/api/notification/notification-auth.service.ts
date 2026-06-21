import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { SessionEntity } from '@/api/auth/entities/session.entity';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import { ESessionUserType } from '@/constants/entity.enum';
import { createCacheKey } from '@/utils/cache.util';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Socket } from 'socket.io';
import { Repository } from 'typeorm';

export type NotificationPrincipal = {
  id: AutoIncrementID;
  sessionId: AutoIncrementID | string;
  tokenHash?: string;
};

@Injectable()
export class NotificationAuthService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async authenticate(client: Socket): Promise<NotificationPrincipal> {
    const token = this.getToken(client);

    if (!token) {
      throw new UnauthorizedException('Missing notification auth token');
    }

    const payload = this.verifyToken(token);
    await this.validateSession(payload);

    const admin = await this.adminUserRepository.findOneBy({
      id: payload.id as AutoIncrementID,
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    return {
      id: payload.id as AutoIncrementID,
      sessionId: payload.sessionId,
      tokenHash: payload.hash,
    };
  }

  async ensureSessionActive(principal: NotificationPrincipal): Promise<void> {
    await this.validateSession({
      id: principal.id,
      sessionId: String(principal.sessionId),
      hash: principal.tokenHash,
      iat: 0,
      exp: 0,
    });
  }

  private verifyToken(token: string): JwtPayloadType {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid notification auth token');
    }
  }

  private async validateSession(payload: JwtPayloadType): Promise<void> {
    if (!payload.sessionId) {
      throw new UnauthorizedException('Missing notification auth session');
    }

    const isSessionBlacklisted = await this.cacheManager.get<boolean>(
      createCacheKey(CacheKey.SESSION_BLACKLIST, payload.sessionId),
    );

    if (isSessionBlacklisted) {
      throw new UnauthorizedException('Notification auth session was revoked');
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
      throw new UnauthorizedException('Notification auth session is inactive');
    }
  }

  private getToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    const queryToken = client.handshake.query?.token;
    const header = client.handshake.headers?.authorization;
    const token = Array.isArray(authToken)
      ? authToken[0]
      : authToken || (Array.isArray(queryToken) ? queryToken[0] : queryToken);

    if (typeof token === 'string' && token.trim()) {
      return this.stripBearerPrefix(token);
    }

    if (Array.isArray(header)) {
      return this.stripBearerPrefix(header[0]);
    }

    return this.stripBearerPrefix(header);
  }

  private stripBearerPrefix(token?: string): string | null {
    if (!token) {
      return null;
    }

    return token.replace(/^Bearer\s+/i, '').trim() || null;
  }
}
