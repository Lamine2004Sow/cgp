import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Attrape toutes les exceptions pour renvoyer systématiquement du JSON
 * avec un message lisible (évite "Erreur API" côté frontend).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = isHttp ? exception.getResponse() : null;
    const message = this.extractMessage(exception, payload);

    if (!isHttp) {
      this.logger.error(
        `${request.method} ${request.url} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      error: isHttp && payload && typeof payload === 'object' && 'error' in payload
        ? (payload as { error?: string }).error
        : 'Internal Server Error',
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private extractMessage(exception: unknown, payload: unknown): string {
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const m = (payload as { message?: string | string[] }).message;
      if (Array.isArray(m) && m.length) return m[0];
      if (typeof m === 'string') return m;
    }
    if (exception instanceof Error && exception.message) {
      return exception.message;
    }
    return 'Erreur serveur';
  }
}
