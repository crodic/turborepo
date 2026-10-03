import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { SocketData } from '../events';

const WINDOW_MS = 10_000; // 10 seconds window
const MAX_REQUESTS = 60; // Max 60 events per 10s per socket

/**
 * WebSocket rate limiting guard.
 * Prevents message flooding from compromised or runaway socket clients.
 */
@Injectable()
export class WsThrottleGuard implements CanActivate {
  private readonly logger = new Logger(WsThrottleGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const client: Socket<any, any, any, SocketData> = context
      .switchToWs()
      .getClient();
    const now = Date.now();

    if (!client.data.rateLimit || now > client.data.rateLimit.resetAt) {
      client.data.rateLimit = {
        count: 1,
        resetAt: now + WINDOW_MS,
      };
      return true;
    }

    client.data.rateLimit.count++;

    if (client.data.rateLimit.count > MAX_REQUESTS) {
      this.logger.warn(
        `Rate limit exceeded for socket ${client.id} (user: ${client.data.principal?.id})`,
      );
      throw new WsException({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many messages sent. Please slow down.',
      });
    }

    return true;
  }
}
