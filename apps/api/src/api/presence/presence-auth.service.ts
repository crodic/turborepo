import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { SessionEntity } from '@/api/session/entities/session.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import { DomainType } from '@/constants/entity.enum';
import { createCacheKey } from '@/utils/cache.util';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { PresencePrincipal, PresenceUserType } from './types';

@Injectable()
export class PresenceAuthService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async authenticate(client: Socket): Promise<PresencePrincipal> {
    const userType = this.getUserType(client);
    const token = this.getToken(client);

    if (!token) {
      throw new UnauthorizedException('Missing socket auth token');
    }

    return userType === PresenceUserType.ADMIN
      ? this.authenticateAdmin(token)
      : this.authenticateUser(token);
  }

  async ensureSessionActive(principal: PresencePrincipal): Promise<void> {
    const domain =
      principal.type === PresenceUserType.ADMIN
        ? DomainType.ADMIN
        : DomainType.CLIENT;

    await this.validateSessionByFields(principal, domain);
  }

  private async authenticateAdmin(token: string): Promise<PresencePrincipal> {
    const payload = this.verifyToken(token, 'auth.secret');
    const session = await this.validateSession(payload, DomainType.ADMIN);

    const admin = await this.userRepository.findOne({
      where: {
        id: payload.id as AutoIncrementID,
        domain: DomainType.ADMIN,
      },
      relations: ['adminProfile'],
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    return {
      id: admin.id,
      type: PresenceUserType.ADMIN,
      sessionId: session.id,
      tokenHash: payload.hash,
      email: admin.email,
      fullName: admin.fullName ?? admin.email,
      avatar: admin.avatarUrl ?? undefined,
    };
  }

  private async authenticateUser(token: string): Promise<PresencePrincipal> {
    const payload = this.verifyToken(token, 'auth.secret');
    const session = await this.validateSession(payload, DomainType.CLIENT);

    const user = await this.userRepository.findOne({
      where: {
        id: payload.id as AutoIncrementID,
        domain: DomainType.CLIENT,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      type: PresenceUserType.USER,
      sessionId: session.id,
      tokenHash: payload.hash,
      email: user.email,
      fullName: user.fullName ?? user.email,
      avatar: user.avatarUrl ?? undefined,
    };
  }

  private verifyToken(
    token: string,
    secretKey: 'auth.secret' = 'auth.secret',
  ): JwtPayloadType {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.getOrThrow(secretKey, { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid socket auth token');
    }
  }

  private async validateSession(
    payload: JwtPayloadType,
    domain: DomainType,
  ): Promise<SessionEntity> {
    return this.validateSessionByFields(payload, domain);
  }

  private async validateSessionByFields(
    payload: Pick<JwtPayloadType, 'id'> & {
      sessionId?: string | AutoIncrementID;
      hash?: string;
      tokenHash?: string;
    },
    domain: DomainType,
  ): Promise<SessionEntity> {
    if (!payload.sessionId) {
      throw new UnauthorizedException('Missing socket auth session');
    }

    const isSessionBlacklisted = await this.cacheManager.get<boolean>(
      createCacheKey(CacheKey.SESSION_BLACKLIST, String(payload.sessionId)),
    );

    if (isSessionBlacklisted) {
      throw new UnauthorizedException('Socket auth session was revoked');
    }

    const session = await this.sessionRepository.findOneBy({
      id: payload.sessionId as AutoIncrementID,
      userId: payload.id as AutoIncrementID,
      domain,
    });
    const tokenHash = payload.hash ?? payload.tokenHash;

    if (
      !session ||
      !tokenHash ||
      (session.refreshTokenHash && session.refreshTokenHash !== tokenHash) ||
      session.isRevoked ||
      (session.expiresAt && session.expiresAt <= new Date())
    ) {
      throw new UnauthorizedException('Socket auth session is inactive');
    }

    return session;
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

  private getUserType(client: Socket): PresenceUserType {
    const rawType =
      client.handshake.auth?.userType ?? client.handshake.query?.userType;
    const type = Array.isArray(rawType) ? rawType[0] : rawType;

    if (type === PresenceUserType.ADMIN || type === PresenceUserType.USER) {
      return type;
    }

    throw new UnauthorizedException('Invalid socket user type');
  }

  private stripBearerPrefix(token?: string): string | null {
    if (!token) {
      return null;
    }

    return token.replace(/^Bearer\s+/i, '').trim() || null;
  }
}
