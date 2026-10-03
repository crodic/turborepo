import { AutoIncrementID } from '@/common/types/common.type';
import { RedisService } from '@/redis/redis.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PresenceService } from './presence.service';

describe('PresenceService', () => {
  let service: PresenceService;
  let mockRedisService: any;

  const memoryHash = new Map<string, string>();
  const memoryZSet = new Map<string, number>();

  beforeEach(async () => {
    memoryHash.clear();
    memoryZSet.clear();

    const pipelineMock = {
      zadd: jest.fn((key: string, score: number, member: string) => {
        memoryZSet.set(`${key}:${member}`, score);
        return pipelineMock;
      }),
      hset: jest.fn((key: string, field: string, value: string) => {
        memoryHash.set(`${key}:${field}`, value);
        return pipelineMock;
      }),
      zrem: jest.fn((key: string, member: string) => {
        memoryZSet.delete(`${key}:${member}`);
        return pipelineMock;
      }),
      hdel: jest.fn((key: string, field: string) => {
        memoryHash.delete(`${key}:${field}`);
        return pipelineMock;
      }),
      zremrangebyscore: jest.fn((key: string, min: any, max: any) => {
        const minVal = min === '-inf' ? -Infinity : Number(min);
        const maxVal = max === '+inf' ? Infinity : Number(max);
        for (const [k, score] of memoryZSet.entries()) {
          if (k.startsWith(`${key}:`)) {
            if (score >= minVal && score <= maxVal) {
              memoryZSet.delete(k);
            }
          }
        }
        return pipelineMock;
      }),
      exec: jest.fn(async () => []),
    };

    mockRedisService = {
      pipeline: jest.fn(() => pipelineMock),
      zrangebyscore: jest.fn(async (key: string, min: any, max: any) => {
        const results: string[] = [];
        const minVal = min === '-inf' ? -Infinity : Number(min);
        const maxVal = max === '+inf' ? Infinity : Number(max);
        for (const [k, score] of memoryZSet.entries()) {
          if (k.startsWith(`${key}:`)) {
            const member = k.replace(`${key}:`, '');
            if (score >= minVal && score <= maxVal) {
              results.push(member);
            }
          }
        }
        return results;
      }),
      hgetall: jest.fn(async (key: string) => {
        const result: Record<string, string> = {};
        for (const [k, val] of memoryHash.entries()) {
          if (k.startsWith(`${key}:`)) {
            const field = k.replace(`${key}:`, '');
            result[field] = val;
          }
        }
        return result;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<PresenceService>(PresenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should touch user and record in Redis', async () => {
    await service.touchUser({
      id: '1' as unknown as AutoIncrementID,
      type: 'admin',
      email: 'admin@example.com',
      fullName: 'Super Admin',
    });

    const snapshot = await service.getSnapshot();
    expect(snapshot.admins).toHaveLength(1);
    expect(snapshot.admins[0].email).toBe('admin@example.com');
    expect(snapshot.counts.admins).toBe(1);
    expect(snapshot.counts.total).toBe(1);
  });

  it('should remove user when requested', async () => {
    await service.touchUser({
      id: '1' as unknown as AutoIncrementID,
      type: 'admin',
      email: 'admin@example.com',
      fullName: 'Super Admin',
    });

    await service.removeUser('admin', '1' as unknown as AutoIncrementID);

    const snapshot = await service.getSnapshot();
    expect(snapshot.admins).toHaveLength(0);
    expect(snapshot.counts.total).toBe(0);
  });

  it('should get online admin IDs correctly', async () => {
    await service.touchUser({
      id: '42' as unknown as AutoIncrementID,
      type: 'admin',
      email: 'admin42@example.com',
      fullName: 'Admin 42',
    });

    await service.touchUser({
      id: '99' as unknown as AutoIncrementID,
      type: 'user',
      email: 'user99@example.com',
      fullName: 'User 99',
    });

    const adminIds = await service.getOnlineAdminIds();
    expect(adminIds).toEqual([42]);
  });
});
