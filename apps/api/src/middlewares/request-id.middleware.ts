import { Injectable, NestMiddleware } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    req.requestId = uuidv4();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  }
}
