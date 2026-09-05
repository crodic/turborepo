import { RedisService } from '@/redis/redis.service';
import { Injectable } from '@nestjs/common';
import {
  OnlinePresence,
  PresencePrincipal,
  PresenceSnapshot,
  PresenceUserType,
} from './types';

type StoredPresenceRecord = Omit<PresencePrincipal, 'tokenHash'> & {
  connectedAt: string;
  lastSeenAt: string;
};

const PRESENCE_RECORDS_KEY = 'presence:records';
const PRESENCE_SOCKET_INDEX_KEY = 'presence:socket_index';
const PRESENCE_USER_SOCKETS_PREFIX = 'presence:user_sockets:';

@Injectable()
export class PresenceService {
  constructor(private readonly redisService: RedisService) {}

  async add(
    socketId: string,
    principal: PresencePrincipal,
  ): Promise<PresenceSnapshot> {
    const key = this.createKey(principal.type, principal.id);
    const userSocketsKey = `${PRESENCE_USER_SOCKETS_PREFIX}${key}`;
    const nowIso = new Date().toISOString();

    await this.redisService.hset(PRESENCE_SOCKET_INDEX_KEY, socketId, key);
    await this.redisService.sadd(userSocketsKey, socketId);

    const existingRaw = await this.redisService.hget(PRESENCE_RECORDS_KEY, key);
    if (existingRaw) {
      try {
        const existing = JSON.parse(existingRaw) as StoredPresenceRecord;
        existing.lastSeenAt = nowIso;
        existing.email = principal.email;
        existing.fullName = principal.fullName;
        existing.avatar = principal.avatar;
        await this.redisService.hset(
          PRESENCE_RECORDS_KEY,
          key,
          JSON.stringify(existing),
        );
      } catch {
        const record: StoredPresenceRecord = {
          id: principal.id,
          type: principal.type,
          sessionId: principal.sessionId,
          email: principal.email,
          fullName: principal.fullName,
          avatar: principal.avatar,
          connectedAt: nowIso,
          lastSeenAt: nowIso,
        };
        await this.redisService.hset(
          PRESENCE_RECORDS_KEY,
          key,
          JSON.stringify(record),
        );
      }
    } else {
      const record: StoredPresenceRecord = {
        id: principal.id,
        type: principal.type,
        sessionId: principal.sessionId,
        email: principal.email,
        fullName: principal.fullName,
        avatar: principal.avatar,
        connectedAt: nowIso,
        lastSeenAt: nowIso,
      };
      await this.redisService.hset(
        PRESENCE_RECORDS_KEY,
        key,
        JSON.stringify(record),
      );
    }

    return await this.getSnapshot();
  }

  async remove(socketId: string): Promise<PresenceSnapshot> {
    const key = await this.redisService.hget(
      PRESENCE_SOCKET_INDEX_KEY,
      socketId,
    );

    if (!key) {
      return await this.getSnapshot();
    }

    const userSocketsKey = `${PRESENCE_USER_SOCKETS_PREFIX}${key}`;
    await this.redisService.hdel(PRESENCE_SOCKET_INDEX_KEY, socketId);
    await this.redisService.srem(userSocketsKey, socketId);

    const remainingSockets = await this.redisService.scard(userSocketsKey);
    if (remainingSockets === 0) {
      await this.redisService.del(userSocketsKey);
      await this.redisService.hdel(PRESENCE_RECORDS_KEY, key);
    } else {
      const rawRecord = await this.redisService.hget(PRESENCE_RECORDS_KEY, key);
      if (rawRecord) {
        try {
          const record = JSON.parse(rawRecord) as StoredPresenceRecord;
          record.lastSeenAt = new Date().toISOString();
          await this.redisService.hset(
            PRESENCE_RECORDS_KEY,
            key,
            JSON.stringify(record),
          );
        } catch {
          // ignore
        }
      }
    }

    return await this.getSnapshot();
  }

  async touch(
    socketId: string,
    principal?: PresencePrincipal,
  ): Promise<PresenceSnapshot> {
    const key = await this.redisService.hget(
      PRESENCE_SOCKET_INDEX_KEY,
      socketId,
    );

    if (key) {
      const rawRecord = await this.redisService.hget(PRESENCE_RECORDS_KEY, key);
      if (rawRecord) {
        try {
          const record = JSON.parse(rawRecord) as StoredPresenceRecord;
          record.lastSeenAt = new Date().toISOString();
          await this.redisService.hset(
            PRESENCE_RECORDS_KEY,
            key,
            JSON.stringify(record),
          );
        } catch {
          // ignore
        }
      }
    } else if (principal) {
      return await this.add(socketId, principal);
    }

    return await this.getSnapshot();
  }

  async getSnapshot(): Promise<PresenceSnapshot> {
    const rawRecords = await this.redisService.hgetall(PRESENCE_RECORDS_KEY);

    const admins: OnlinePresence[] = [];
    const users: OnlinePresence[] = [];

    const keys = Object.keys(rawRecords);
    if (keys.length === 0) {
      return {
        admins: [],
        users: [],
        counts: { admins: 0, users: 0, total: 0 },
      };
    }

    const pipeline = this.redisService.pipeline();
    for (const key of keys) {
      pipeline.scard(`${PRESENCE_USER_SOCKETS_PREFIX}${key}`);
    }
    const socketCountResults = await pipeline.exec();

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const raw = rawRecords[key];
      const countResult = socketCountResults?.[i];
      const socketCount =
        countResult && countResult[0] === null ? Number(countResult[1]) : 0;

      if (socketCount === 0) {
        await this.redisService.hdel(PRESENCE_RECORDS_KEY, key);
        continue;
      }

      try {
        const stored = JSON.parse(raw) as StoredPresenceRecord;
        const onlinePresence: OnlinePresence = {
          id: stored.id,
          type: stored.type,
          sessionId: stored.sessionId,
          email: stored.email,
          fullName: stored.fullName,
          avatar: stored.avatar,
          socketCount,
          connectedAt: new Date(stored.connectedAt),
          lastSeenAt: new Date(stored.lastSeenAt),
        };

        if (stored.type === PresenceUserType.ADMIN) {
          admins.push(onlinePresence);
        } else {
          users.push(onlinePresence);
        }
      } catch {
        await this.redisService.hdel(PRESENCE_RECORDS_KEY, key);
      }
    }

    admins.sort((a, b) => a.fullName?.localeCompare(b.fullName ?? '') ?? 0);
    users.sort((a, b) => a.fullName?.localeCompare(b.fullName ?? '') ?? 0);

    return {
      admins,
      users,
      counts: {
        admins: admins.length,
        users: users.length,
        total: admins.length + users.length,
      },
    };
  }

  async pruneDeadSockets(liveSocketIds: Set<string>): Promise<boolean> {
    const allSockets = await this.redisService.hgetall(
      PRESENCE_SOCKET_INDEX_KEY,
    );
    const staleSocketIds: string[] = [];

    for (const socketId of Object.keys(allSockets)) {
      if (!liveSocketIds.has(socketId)) {
        staleSocketIds.push(socketId);
      }
    }

    if (staleSocketIds.length === 0) {
      return false;
    }

    for (const socketId of staleSocketIds) {
      await this.remove(socketId);
    }

    return true;
  }

  async getOnlineAdminIds(): Promise<number[]> {
    const snapshot = await this.getSnapshot();
    return snapshot.admins.map((a) => Number(a.id)).filter((id) => !isNaN(id));
  }

  private createKey(type: PresenceUserType, id: string | number) {
    return `${type}:${id}`;
  }
}
