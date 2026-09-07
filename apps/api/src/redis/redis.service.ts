import { AllConfigType } from '@/config/config.type';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { ChainableCommander } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    const host = this.configService.getOrThrow('redis.host', { infer: true });
    const port = this.configService.getOrThrow('redis.port', { infer: true });
    const password = this.configService.get('redis.password', { infer: true });
    const tlsEnabled = this.configService.get('redis.tlsEnabled', {
      infer: true,
    });

    this.client = new Redis({
      host,
      port,
      password: password ?? undefined,
      tls: tlsEnabled ? {} : undefined,
      lazyConnect: true,
    });
  }

  getClient(): Redis {
    return this.client;
  }

  pipeline(): ChainableCommander {
    return this.client.pipeline();
  }

  // --- String Operations ---

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<string> {
    if (ttlSeconds) {
      return await this.client.set(key, value, 'EX', ttlSeconds);
    }
    return await this.client.set(key, value);
  }

  async del(...keys: string[]): Promise<number> {
    return await this.client.del(...keys);
  }

  async exists(...keys: string[]): Promise<number> {
    return await this.client.exists(...keys);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return await this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  // --- Hash Operations ---

  async hget(key: string, field: string): Promise<string | null> {
    return await this.client.hget(key, field);
  }

  async hset(
    key: string,
    fieldOrObj: string | Record<string, string | number>,
    value?: string | number,
  ): Promise<number> {
    if (typeof fieldOrObj === 'object') {
      return await this.client.hset(key, fieldOrObj);
    }
    return await this.client.hset(key, fieldOrObj, value!);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return await this.client.hdel(key, ...fields);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.client.hgetall(key);
  }

  async hexists(key: string, field: string): Promise<number> {
    return await this.client.hexists(key, field);
  }

  async hlen(key: string): Promise<number> {
    return await this.client.hlen(key);
  }

  async hkeys(key: string): Promise<string[]> {
    return await this.client.hkeys(key);
  }

  async hvals(key: string): Promise<string[]> {
    return await this.client.hvals(key);
  }

  // --- Set Operations ---

  async sadd(key: string, ...members: (string | number)[]): Promise<number> {
    return await this.client.sadd(key, ...members);
  }

  async srem(key: string, ...members: (string | number)[]): Promise<number> {
    return await this.client.srem(key, ...members);
  }

  async scard(key: string): Promise<number> {
    return await this.client.scard(key);
  }

  async smembers(key: string): Promise<string[]> {
    return await this.client.smembers(key);
  }

  async sismember(key: string, member: string | number): Promise<number> {
    return await this.client.sismember(key, member);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
