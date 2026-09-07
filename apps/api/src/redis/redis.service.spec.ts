import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';

jest.mock('ioredis', () => {
  const mockPipeline = {
    scard: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([[null, 1]]),
  };
  const mockRedis = jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue('test_value'),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(3600),
    hget: jest.fn().mockResolvedValue('test_hvalue'),
    hset: jest.fn().mockResolvedValue(1),
    hdel: jest.fn().mockResolvedValue(1),
    hgetall: jest.fn().mockResolvedValue({ f1: 'v1' }),
    hexists: jest.fn().mockResolvedValue(1),
    hlen: jest.fn().mockResolvedValue(1),
    hkeys: jest.fn().mockResolvedValue(['f1']),
    hvals: jest.fn().mockResolvedValue(['v1']),
    sadd: jest.fn().mockResolvedValue(1),
    srem: jest.fn().mockResolvedValue(1),
    scard: jest.fn().mockResolvedValue(1),
    smembers: jest.fn().mockResolvedValue(['m1']),
    sismember: jest.fn().mockResolvedValue(1),
    pipeline: jest.fn().mockReturnValue(mockPipeline),
    quit: jest.fn().mockResolvedValue('OK'),
  }));
  return { __esModule: true, default: mockRedis };
});

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'redis.host') return 'localhost';
              if (key === 'redis.port') return 6379;
              return '';
            }),
            get: jest.fn((key: string) => {
              if (key === 'redis.password') return undefined;
              if (key === 'redis.tlsEnabled') return false;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get a value by key', async () => {
    const result = await service.get('test_key');
    expect(result).toBe('test_value');
  });

  it('should set a value without ttl', async () => {
    const result = await service.set('test_key', 'test_value');
    expect(result).toBe('OK');
  });

  it('should set a value with ttl', async () => {
    const result = await service.set('test_key', 'test_value', 60);
    expect(result).toBe('OK');
  });

  it('should delete a key', async () => {
    const result = await service.del('test_key');
    expect(result).toBe(1);
  });

  it('should check if a key exists', async () => {
    const result = await service.exists('test_key');
    expect(result).toBe(1);
  });

  it('should set expiration on a key', async () => {
    const result = await service.expire('test_key', 300);
    expect(result).toBe(1);
  });

  it('should get ttl of a key', async () => {
    const result = await service.ttl('test_key');
    expect(result).toBe(3600);
  });

  it('should perform hash operations (hget, hset, hdel, hgetall, hexists, hlen, hkeys, hvals)', async () => {
    expect(await service.hget('hk', 'field')).toBe('test_hvalue');
    expect(await service.hset('hk', 'field', 'val')).toBe(1);
    expect(await service.hset('hk', { field: 'val' })).toBe(1);
    expect(await service.hdel('hk', 'field')).toBe(1);
    expect(await service.hgetall('hk')).toEqual({ f1: 'v1' });
    expect(await service.hexists('hk', 'field')).toBe(1);
    expect(await service.hlen('hk')).toBe(1);
    expect(await service.hkeys('hk')).toEqual(['f1']);
    expect(await service.hvals('hk')).toEqual(['v1']);
  });

  it('should perform set operations (sadd, srem, scard, smembers, sismember)', async () => {
    expect(await service.sadd('sk', 'm1')).toBe(1);
    expect(await service.srem('sk', 'm1')).toBe(1);
    expect(await service.scard('sk')).toBe(1);
    expect(await service.smembers('sk')).toEqual(['m1']);
    expect(await service.sismember('sk', 'm1')).toBe(1);
  });

  it('should return a pipeline', () => {
    const pipeline = service.pipeline();
    expect(pipeline).toBeDefined();
    expect(pipeline.scard).toBeDefined();
  });

  it('should quit redis on module destroy', async () => {
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });
});
