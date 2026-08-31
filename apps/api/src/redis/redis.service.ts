import { AllConfigType } from '@/config/config.type';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

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

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
