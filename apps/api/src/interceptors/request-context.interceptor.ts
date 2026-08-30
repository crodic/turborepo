import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { catchError, Observable, throwError } from 'rxjs';
import { DataSource } from 'typeorm';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(
    private readonly cls: ClsService,
    private readonly dataSource: DataSource,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();

    if (this.cls?.isActive()) {
      this.cls.set('ip', req.ip);
      this.cls.set('userAgent', req.headers['user-agent']);
      this.cls.set('requestId', req.headers['x-request-id'] || req.requestId);
      this.cls.set('method', req.method);
      this.cls.set('endpoint', req.originalUrl || req.url);
      this.cls.set('body', req.body);
    }

    return next.handle().pipe(
      catchError((error) => {
        return throwError(() => error);
      }),
    );
  }
}
