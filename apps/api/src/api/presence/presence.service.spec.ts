import { AutoIncrementID } from '@/common/types/common.type';
import { RedisService } from '@/redis/redis.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PresenceService } from './presence.service';
import { PresencePrincipal, PresenceUserType } from './types';

describe('PresenceService', () => {
  let service: PresenceService;
  let mockRedisService: any;

  const memoryHash = new Map<string, string>();
  const memorySets = new Map<string, Set<string>>();

  beforeEach(async () => {
    memoryHash.clear();
    memorySets.clear();

    mockRedisService = {
      hset: jest.fn(async (hashKey: string, field: string, val: string) => {
        memoryHash.set(`${hashKey}:${field}`, val);
        return 1;
      }),
      hget: jest.fn(async (hashKey: string, field: string) => {
        return memoryHash.get(`${hashKey}:${field}`) ?? null;
      }),
      hdel: jest.fn(async (hashKey: string, field: string) => {
        const deleted = memoryHash.delete(`${hashKey}:${field}`);
        return deleted ? 1 : 0;
      }),
      hgetall: jest.fn(async (hashKey: string) => {
        const result: Record<string, string> = {};
        for (const [k, v] of memoryHash.entries()) {
          if (k.startsWith(`${hashKey}:`)) {
            const field = k.replace(`${hashKey}:`, '');
            result[field] = v;
          }
        }
        return result;
      }),
      sadd: jest.fn(async (setKey: string, member: string) => {
        if (!memorySets.has(setKey)) {
          memorySets.set(setKey, new Set());
        }
        memorySets.get(setKey)!.add(member);
        return 1;
      }),
      srem: jest.fn(async (setKey: string, member: string) => {
        const set = memorySets.get(setKey);
        if (!set) return 0;
        const deleted = set.delete(member);
        return deleted ? 1 : 0;
      }),
      scard: jest.fn(async (setKey: string) => {
        return memorySets.get(setKey)?.size ?? 0;
      }),
      del: jest.fn(async (key: string) => {
        memorySets.delete(key);
        return 1;
      }),
      pipeline: jest.fn(() => {
        const commands: Array<() => Promise<any>> = [];
        const pipe = {
          scard: (setKey: string) => {
            commands.push(async () => memorySets.get(setKey)?.size ?? 0);
            return pipe;
          },
          exec: async () => {
            const results: Array<[null, any]> = [];
            for (const cmd of commands) {
              const res = await cmd();
              results.push([null, res]);
            }
            return results;
          },
        };
        return pipe;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceService,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<PresenceService>(PresenceService);
  });

  const adminPrincipal: PresencePrincipal = {
    id: '1' as AutoIncrementID,
    type: PresenceUserType.ADMIN,
    sessionId: 'session-1',
    tokenHash: 'hash-1',
    email: 'admin@example.com',
    fullName: 'Admin User',
    avatar: 'https://example.com/avatar.png',
  };

  const userPrincipal: PresencePrincipal = {
    id: '2' as AutoIncrementID,
    type: PresenceUserType.USER,
    sessionId: 'session-2',
    tokenHash: 'hash-2',
    email: 'user@example.com',
    fullName: 'Normal User',
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('adds an admin socket and returns snapshot with 1 admin', async () => {
    const snapshot = await service.add('socket-1', adminPrincipal);

    expect(snapshot.counts).toEqual({ admins: 1, users: 0, total: 1 });
    expect(snapshot.admins).toHaveLength(1);
    expect(snapshot.admins[0].id).toBe('1');
    expect(snapshot.admins[0].socketCount).toBe(1);
    expect(snapshot.users).toHaveLength(0);
  });

  it('handles multiple sockets for the same admin', async () => {
    await service.add('socket-1', adminPrincipal);
    const snapshot = await service.add('socket-2', adminPrincipal);

    expect(snapshot.counts).toEqual({ admins: 1, users: 0, total: 1 });
    expect(snapshot.admins).toHaveLength(1);
    expect(snapshot.admins[0].socketCount).toBe(2);
  });

  it('adds both admin and user sockets', async () => {
    await service.add('socket-1', adminPrincipal);
    const snapshot = await service.add('socket-user-1', userPrincipal);

    expect(snapshot.counts).toEqual({ admins: 1, users: 1, total: 2 });
    expect(snapshot.admins).toHaveLength(1);
    expect(snapshot.users).toHaveLength(1);
    expect(snapshot.users[0].id).toBe('2');
  });

  it('removes a single socket but keeps user online if other sockets exist', async () => {
    await service.add('socket-1', adminPrincipal);
    await service.add('socket-2', adminPrincipal);

    const snapshot = await service.remove('socket-1');

    expect(snapshot.counts.admins).toBe(1);
    expect(snapshot.admins[0].socketCount).toBe(1);
  });

  it('completely removes user when all sockets disconnect', async () => {
    await service.add('socket-1', adminPrincipal);
    const snapshot = await service.remove('socket-1');

    expect(snapshot.counts).toEqual({ admins: 0, users: 0, total: 0 });
    expect(snapshot.admins).toHaveLength(0);
  });

  it('touch updates lastSeenAt', async () => {
    await service.add('socket-1', adminPrincipal);
    const snapshot = await service.touch('socket-1');

    expect(snapshot.counts.admins).toBe(1);
    expect(snapshot.admins[0].lastSeenAt).toBeInstanceOf(Date);
  });

  it('touch re-adds socket if key was missing from index but principal is provided', async () => {
    const snapshot = await service.touch('socket-recovered', adminPrincipal);
    expect(snapshot.counts.admins).toBe(1);
    expect(snapshot.admins[0].id).toBe('1');
  });

  it('prunes dead sockets and cleans up orphaned records', async () => {
    await service.add('socket-alive', adminPrincipal);
    await service.add('socket-dead-1', adminPrincipal);
    await service.add('socket-dead-2', userPrincipal);

    const initialSnapshot = await service.getSnapshot();
    expect(initialSnapshot.counts.admins).toBe(1);
    expect(initialSnapshot.admins[0].socketCount).toBe(2);
    expect(initialSnapshot.counts.users).toBe(1);

    const pruned = await service.pruneDeadSockets(new Set(['socket-alive']));
    expect(pruned).toBe(true);

    const cleanedSnapshot = await service.getSnapshot();
    expect(cleanedSnapshot.counts.admins).toBe(1);
    expect(cleanedSnapshot.admins[0].socketCount).toBe(1);
    expect(cleanedSnapshot.counts.users).toBe(0);
  });

  it('returns online admin IDs correctly', async () => {
    await service.add('socket-1', adminPrincipal);
    await service.add('socket-2', userPrincipal);

    const adminIds = await service.getOnlineAdminIds();
    expect(adminIds).toEqual([1]);
  });
});
