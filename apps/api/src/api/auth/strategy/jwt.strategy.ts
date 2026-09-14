import { SessionEntity } from '@/api/auth/entities/session.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { CacheKey } from '@/constants/cache.constant';
import { ESessionUserType } from '@/constants/entity.enum';
import { createCacheKey } from '@/utils/cache.util';
import { Cache } from '@nestjs/cache-manager';
import { UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';

export interface ValidateJwtSessionParams<TUser> {
  payload: any;
  userType: ESessionUserType;
  cache: Cache;
  sessionRepository: Repository<SessionEntity>;
  findUser: (id: AutoIncrementID) => Promise<TUser | null>;
}

export async function validateJwtSessionPayload<TUser>(
  params: ValidateJwtSessionParams<TUser>,
) {
  const isSessionBlacklisted = params.payload.sessionId
    ? await params.cache.get<boolean>(
        createCacheKey(CacheKey.SESSION_BLACKLIST, params.payload.sessionId),
      )
    : false;

  if (isSessionBlacklisted) {
    throw new UnauthorizedException();
  }

  const session = params.payload.sessionId
    ? await params.sessionRepository.findOneBy({
        id: params.payload.sessionId as AutoIncrementID,
        userId: params.payload.id as AutoIncrementID,
        userType: params.userType,
      })
    : null;

  if (
    !session ||
    !params.payload.hash ||
    session.hash !== params.payload.hash ||
    session.revokedAt ||
    (session.expiresAt && session.expiresAt <= new Date())
  ) {
    throw new UnauthorizedException();
  }

  const user = await params.findUser(params.payload.id as AutoIncrementID);

  if (!user) {
    throw new UnauthorizedException();
  }

  return {
    ...user,
    sessionId: params.payload.sessionId,
    iat: params.payload.iat,
    exp: params.payload.exp,
  };
}
