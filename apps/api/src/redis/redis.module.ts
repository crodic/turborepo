import { AllConfigType } from '@/config/config.type';
import KeyvRedis from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheableMemory, Keyv } from 'cacheable';
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService<AllConfigType>) => {
        const host = config.getOrThrow('redis.host', { infer: true });
        const port = config.getOrThrow('redis.port', { infer: true });
        const password = config.getOrThrow('redis.password', { infer: true });

        const uri = `redis://${password}@${host}:${port}`;

        return {
          stores: [
            new Keyv({
              store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
            }),
            new KeyvRedis(uri),
          ],
        };
      },
      isGlobal: true,
      inject: [ConfigService],
    }),
  ],
  providers: [],
  exports: [],
})
export class RedisModule {}
