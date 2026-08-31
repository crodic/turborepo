import { AllConfigType } from '@/config/config.type';
import KeyvRedis from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheableMemory, Keyv } from 'cacheable';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      isGlobal: true,
      useFactory: (config: ConfigService<AllConfigType>) => {
        const host = String(config.getOrThrow('redis.host', { infer: true }));
        const port = Number(config.getOrThrow('redis.port', { infer: true }));
        const password = config.get('redis.password', { infer: true });

        const auth = password ? `:${encodeURIComponent(password)}@` : '';
        const uri = `redis://${auth}${host}:${port}`;

        return {
          stores: [
            new Keyv({
              store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
            }),
            new KeyvRedis(uri),
          ],
        };
      },
    }),
  ],
  providers: [RedisService],
  exports: [CacheModule, RedisService],
})
export class RedisModule {}
