import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';
import { AUDIT_ACTION_KEY, AUDIT_TARGET_KEY } from '../decorators/audit.decorator';
import { AuditService } from '../../modules/audit/audit.service';

const METHOD_ACTION_MAP: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const method = request.method ?? 'GET';

    const actionMetadata = this.reflector.getAllAndOverride<string>(
      AUDIT_ACTION_KEY,
      [context.getHandler(), context.getClass()],
    );
    const targetMetadata = this.reflector.getAllAndOverride<string>(
      AUDIT_TARGET_KEY,
      [context.getHandler(), context.getClass()],
    );

    const inferredAction = METHOD_ACTION_MAP[method];
    const shouldAudit = Boolean(actionMetadata || inferredAction);

    if (!shouldAudit) {
      return next.handle();
    }

    const action = actionMetadata ?? inferredAction;
    const targetType = targetMetadata ?? request.route?.path ?? 'unknown';
    const targetId = this.extractTargetId(request);

    return next.handle().pipe(
      tap(async () => {
        try {
          await this.auditService.log({
            userId: request.user?.userId,
            action,
            targetType,
            targetId,
          });
        } catch {
          // Avoid breaking request pipeline on audit failures.
        }
      }),
    );
  }

  private extractTargetId(request: Request): string | undefined {
    const paramId = request.params?.id ?? request.params?.['id_entite'];
    if (paramId) {
      return String(paramId);
    }

    return undefined;
  }
}
