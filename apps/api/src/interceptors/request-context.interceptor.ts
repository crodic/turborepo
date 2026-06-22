import { ImpersonateLogEntity } from '@/api/impersonate-log/entities/impersonate-log.entity';
import {
  isMutatingMethod,
  sanitizePayload,
} from '@/api/impersonate-log/impersonate-log.util';
import { EImpersonateLogStatus } from '@/constants/entity.enum';
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
        void this.saveFailedImpersonationLog(error);

        return throwError(() => error);
      }),
    );
  }

  private async saveFailedImpersonationLog(error: unknown) {
    const impersonation = this.cls.get('impersonation');
    const method = this.cls.get('method');

    if (!impersonation || !isMutatingMethod(method)) {
      return;
    }

    const repository = this.dataSource.getRepository(ImpersonateLogEntity);
    await repository.save(
      repository.create({
        sessionId: impersonation.sessionId,
        historyId: impersonation.historyId,
        adminId: impersonation.adminId,
        targetUserId: impersonation.targetUserId,
        action: 'REQUEST_FAILED',
        method: method.toUpperCase(),
        endpoint: this.cls.get('endpoint') ?? '',
        input: sanitizePayload(this.cls.get('body')),
        output: null,
        before: null,
        after: null,
        changedFields: [],
        status: EImpersonateLogStatus.FAILED,
        errorMessage: this.getErrorMessage(error),
        ipAddress: this.cls.get('ip'),
        userAgent: this.cls.get('userAgent'),
      }),
    );
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'string' && error.trim()) {
      return error.trim();
    }

    return 'Request failed';
  }
}
