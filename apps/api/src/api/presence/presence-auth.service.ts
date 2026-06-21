import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { SessionEntity } from '@/api/auth/entities/session.entity';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { UserEntity } from '@/api/user/entities/user.entity';
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
import { PresencePrincipal, PresenceUserType } from './types';

@Injectable()
export class PresenceAuthService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
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
    const userType =
      principal.type === PresenceUserType.ADMIN
        ? ESessionUserType.ADMIN
        : ESessionUserType.USER;

    await this.validateSessionByFields(principal, userType);
  }

  private async authenticateAdmin(token: string): Promise<PresencePrincipal> {
    const payload = this.verifyToken(token, 'auth.secret');
    const session = await this.validateSession(payload, ESessionUserType.ADMIN);

    const admin = await this.adminUserRepository.findOne({
      where: { id: payload.id as AutoIncrementID },
      select: ['id', 'email', 'firstName', 'lastName', 'fullName', 'avatar'],
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
      fullName: admin.fullName,
      avatar: admin.avatar,
    };
  }

  private async authenticateUser(token: string): Promise<PresencePrincipal> {
    const payload = this.verifyToken(token, 'auth.userSecret');
    const session = await this.validateSession(payload, ESessionUserType.USER);

    const user = await this.userRepository.findOne({
      where: { id: payload.id as AutoIncrementID },
      select: ['id', 'email', 'firstName', 'lastName', 'fullName', 'avatar'],
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
      fullName: user.fullName,
      avatar: user.avatar,
      impersonatedBy: session.impersonatedBy,
    };
  }

  private verifyToken(
    token: string,
    secretKey: 'auth.secret' | 'auth.userSecret',
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
    userType: ESessionUserType,
  ): Promise<SessionEntity> {
    return this.validateSessionByFields(payload, userType);
  }

  private async validateSessionByFields(
    payload: Pick<JwtPayloadType, 'id'> & {
      sessionId?: string | AutoIncrementID;
      hash?: string;
      tokenHash?: string;
    },
    userType: ESessionUserType,
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
      userType,
    });
    const tokenHash = payload.hash ?? payload.tokenHash;

    if (
      !session ||
      !tokenHash ||
      session.hash !== tokenHash ||
      session.revokedAt ||
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
