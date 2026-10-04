import { IAuthSession } from '@/api/auth/interfaces/auth-entity.interface';
import { AutoIncrementID } from '@/common/types/common.type';
import { CacheKey } from '@/constants/cache.constant';
import { createCacheKey } from '@/utils/cache.util';
import { Cache } from '@nestjs/cache-manager';
import { UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';

export interface ValidateJwtSessionParams<
  TUser,
  TSession extends IAuthSession = IAuthSession,
> {
  payload: any;
  cache: Cache;
  sessionRepository: Repository<TSession>;
  findUser: (id: AutoIncrementID) => Promise<TUser | null>;
}

export async function validateJwtSessionPayload<
  TUser,
  TSession extends IAuthSession = IAuthSession,
>(params: ValidateJwtSessionParams<TUser, TSession>) {
  const isSessionBlacklisted = params.payload.sessionId
    ? await params.cache.get<boolean>(
        createCacheKey(CacheKey.SESSION_BLACKLIST, params.payload.sessionId),
      )
    : false;

  if (isSessionBlacklisted) {
    throw new UnauthorizedException();
  }

  const session = params.payload.sessionId
    ? ((await params.sessionRepository.findOneBy({
        id: params.payload.sessionId as AutoIncrementID,
      } as any)) as unknown as TSession | null)
    : null;

  if (
    !session ||
    !params.payload.hash ||
    session.hash !== params.payload.hash ||
    String(session.userId) !== String(params.payload.id) ||
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
