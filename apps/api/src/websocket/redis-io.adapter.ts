import { AllConfigType } from '@/config/config.type';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private readonly adapterLogger = new Logger(RedisIoAdapter.name);

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(
    configService: ConfigService<AllConfigType>,
  ): Promise<void> {
    const host = configService.getOrThrow('redis.host', { infer: true });
    const port = configService.getOrThrow('redis.port', { infer: true });
    const password = configService.get('redis.password', { infer: true });
    const tlsEnabled = configService.get('redis.tlsEnabled', { infer: true });

    const pubClient = new Redis({
      host,
      port,
      password: password ?? undefined,
      tls: tlsEnabled ? {} : undefined,
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });

    const subClient = pubClient.duplicate();

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        if (pubClient.status === 'ready') {
          resolve();
          return;
        }
        pubClient.once('ready', () => resolve());
        pubClient.once('error', (err) => reject(err));
      }),
      new Promise<void>((resolve, reject) => {
        if (subClient.status === 'ready') {
          resolve();
          return;
        }
        subClient.once('ready', () => resolve());
        subClient.once('error', (err) => reject(err));
      }),
    ]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.adapterLogger.log(
      'Socket.IO Redis Adapter connected and synchronized successfully',
    );
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
