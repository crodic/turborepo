import { AutoIncrementID } from '@/common/types/common.type';
import { RedisService } from '@/redis/redis.service';
import { Injectable, Logger } from '@nestjs/common';
import {
  OnlinePresenceDto,
  PresenceCountsDto,
  PresenceSnapshotDto,
} from './dto/presence.dto';

export type PresenceUserMeta = {
  id: AutoIncrementID;
  type: 'admin' | 'user';
  email: string;
  fullName?: string;
  avatar?: string;
  sessionId?: AutoIncrementID | string;
};

const PRESENCE_USERS_KEY = 'presence:users';
const PRESENCE_HEARTBEATS_KEY = 'presence:heartbeats';
const DEFAULT_EXPIRATION_MS = 60_000; // 60 seconds without heartbeat marks user offline

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Touch/heartbeat a user to mark them online.
   * Updates Redis sorted set with timestamp and updates user record.
   */
  async touchUser(userMeta: PresenceUserMeta): Promise<void> {
    const key = this.createKey(userMeta.type, userMeta.id);
    const now = Date.now();
    const record: OnlinePresenceDto = {
      id: userMeta.id,
      type: userMeta.type,
      sessionId: userMeta.sessionId,
      email: userMeta.email,
      fullName: userMeta.fullName,
      avatar: userMeta.avatar,
      lastSeenAt: new Date(now).toISOString(),
    };

    const pipeline = this.redisService.pipeline();
    pipeline.zadd(PRESENCE_HEARTBEATS_KEY, now, key);
    pipeline.hset(PRESENCE_USERS_KEY, key, JSON.stringify(record));
    await pipeline.exec();
  }

  /**
   * Remove a user immediately from presence tracking (e.g., on logout).
   */
  async removeUser(type: 'admin' | 'user', id: AutoIncrementID): Promise<void> {
    const key = this.createKey(type, id);
    const pipeline = this.redisService.pipeline();
    pipeline.zrem(PRESENCE_HEARTBEATS_KEY, key);
    pipeline.hdel(PRESENCE_USERS_KEY, key);
    await pipeline.exec();
  }

  /**
   * Get a complete snapshot of online admins and users, pruning dead entries.
   */
  async getSnapshot(
    timeoutMs: number = DEFAULT_EXPIRATION_MS,
  ): Promise<PresenceSnapshotDto> {
    await this.cleanupStale(timeoutMs);

    const rawRecords = await this.redisService.hgetall(PRESENCE_USERS_KEY);
    const admins: OnlinePresenceDto[] = [];
    const users: OnlinePresenceDto[] = [];

    for (const raw of Object.values(rawRecords)) {
      try {
        const item = JSON.parse(raw) as OnlinePresenceDto;
        if (item.type === 'admin') {
          admins.push(item);
        } else {
          users.push(item);
        }
      } catch {
        // Skip corrupted entries
      }
    }

    admins.sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''));
    users.sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''));

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

  /**
   * Get online user counts.
   */
  async getCounts(
    timeoutMs: number = DEFAULT_EXPIRATION_MS,
  ): Promise<PresenceCountsDto> {
    const snapshot = await this.getSnapshot(timeoutMs);
    return snapshot.counts;
  }

  /**
   * Get list of online admin IDs.
   */
  async getOnlineAdminIds(
    timeoutMs: number = DEFAULT_EXPIRATION_MS,
  ): Promise<number[]> {
    const snapshot = await this.getSnapshot(timeoutMs);
    return snapshot.admins
      .map((a) => Number(a.id))
      .filter((id) => !Number.isNaN(id));
  }

  /**
   * Prunes entries with expired heartbeat timestamps from Redis.
   */
  private async cleanupStale(
    timeoutMs: number = DEFAULT_EXPIRATION_MS,
  ): Promise<void> {
    const cutoff = Date.now() - timeoutMs;
    const expiredKeys = await this.redisService.zrangebyscore(
      PRESENCE_HEARTBEATS_KEY,
      '-inf',
      cutoff,
    );

    if (!expiredKeys || expiredKeys.length === 0) {
      return;
    }

    const pipeline = this.redisService.pipeline();
    pipeline.zremrangebyscore(PRESENCE_HEARTBEATS_KEY, '-inf', cutoff);
    for (const key of expiredKeys) {
      pipeline.hdel(PRESENCE_USERS_KEY, key);
    }
    await pipeline.exec();
  }

  private createKey(type: string, id: AutoIncrementID): string {
    return `${type}:${id}`;
  }
}
